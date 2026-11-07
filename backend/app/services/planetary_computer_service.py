"""Microsoft Planetary Computer discovery and Sentinel-2 L2A acquisition adapter."""
import json
import os
import time
import threading
import zipfile
from datetime import datetime

import numpy as np
import requests
from rasterio.enums import Resampling
from rasterio.mask import mask
from rasterio.warp import reproject, transform as transform_coords, transform_geom
from rasterio.transform import xy

from ..config import PLANETARY_COMPUTER_STAC, PUNE_BOUNDARY_URL
from ..utils.helpers import BASE

COLLECTION = "sentinel-2-l2a"
BANDS = ("B02", "B03", "B04", "B08", "B11")
VALID_SCL = {4, 5, 6, 7}
REQUEST_TIMEOUT = 300
MAX_RETRIES = 2
RASTER_JOB_LIMIT = threading.BoundedSemaphore(2)


def pune_boundary():
    path = os.path.join(BASE, "data", "aoi", "pune_district.geojson")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        response = requests.get(
            PUNE_BOUNDARY_URL,
            params={"q": "Pune district, Maharashtra, India", "format": "jsonv2", "polygon_geojson": 1, "limit": 1},
            headers={"User-Agent": "BhuRakshak/1.0 satellite acquisition"},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        with open(path, "wb") as target:
            target.write(response.content)
    with open(path, encoding="utf-8") as source:
        results = json.load(source)
    if not results or "geojson" not in results[0]:
        raise RuntimeError("The downloaded district boundary does not contain Pune")
    return results[0]["geojson"]


def _search_payload(geometry, start_date, end_date, max_cloud_cover, limit):
    return {
        "collections": [COLLECTION],
        "intersects": geometry,
        "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
        "limit": limit,
        "query": {"eo:cloud_cover": {"lte": max_cloud_cover}},
    }


def search(start_date, end_date, max_cloud_cover=30, limit=20, geometry=None):
    geometry = geometry or pune_boundary()
    response = requests.post(
        f"{PLANETARY_COMPUTER_STAC}/search",
        json=_search_payload(geometry, start_date, end_date, max_cloud_cover, limit),
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    results = []
    for item in response.json().get("features", []):
        props = item.get("properties", {})
        cloud_cover = float(props.get("eo:cloud_cover", 100))
        # Keep the client-side filter too: STAC servers can return a broader
        # page when the query extension is unsupported or partially applied.
        if cloud_cover > max_cloud_cover:
            continue
        assets = item.get("assets", {})
        results.append({
            "external_scene_id": item["id"],
            "provider": "Microsoft Planetary Computer",
            "source_type": "real",
            "study_area_name": "Pune district",
            "scene_date": props.get("datetime", "")[:10],
            "acquisition_date": props.get("datetime"),
            "cloud_cover_percent": cloud_cover,
            "tile_id": props.get("s2:mgrs_tile") or item["id"].split("_")[-2],
            "sensor": "Sentinel-2",
            "spatial_resolution": "10 m target grid",
            "assets": {name: assets[name].get("href") for name in (*BANDS, "SCL", "visual") if name in assets},
            "geometry": geometry,
            "provider_metadata": item,
        })
    return results


def _signed(href):
    try:
        import planetary_computer
    except ImportError as exc:
        raise RuntimeError("Install backend requirements to enable Planetary Computer asset signing") from exc
    return planetary_computer.sign(href)


def _open_remote(href):
    import rasterio
    for attempt in range(MAX_RETRIES + 1):
        try:
            return rasterio.open(_signed(href))
        except (OSError, requests.RequestException):
            if attempt == MAX_RETRIES:
                raise
            time.sleep(2**attempt)


def _target_grid(dataset, geometry):
    source_geometry = transform_geom("EPSG:4326", dataset.crs, geometry)
    clipped, transform = mask(dataset, [source_geometry], crop=True, filled=False)
    if clipped.shape[1] == 0 or clipped.shape[2] == 0:
        raise ValueError("The selected Pune area does not overlap this scene")
    return dataset.crs, transform, clipped.shape[1:]


def download_scene(metadata, output_directory):
    """Download only the six required assets and emit the existing five-band NPZ contract."""
    with RASTER_JOB_LIMIT:
        assets = metadata["assets"]
        missing = set((*BANDS, "SCL")) - set(assets)
        if missing:
            raise ValueError(f"Sentinel scene is missing required assets: {', '.join(sorted(missing))}")
        geometry = metadata["geometry"]
        os.makedirs(output_directory, exist_ok=True)
        with _open_remote(assets["B04"]) as red:
            target_crs, transform, shape_ = _target_grid(red, geometry)
            target = {}
            for band in BANDS:
                with _open_remote(assets[band]) as source:
                    values = np.zeros(shape_, dtype="float32")
                    reproject(
                        source=rasterio_band(source),
                        destination=values,
                        src_transform=source.transform,
                        src_crs=source.crs,
                        dst_transform=transform,
                        dst_crs=target_crs,
                        resampling=Resampling.bilinear,
                    )
                    target[band] = values
            with _open_remote(assets["SCL"]) as scl:
                scene_class = np.zeros(shape_, dtype="uint8")
                reproject(
                    source=rasterio_band(scl),
                    destination=scene_class,
                    src_transform=scl.transform,
                    src_crs=scl.crs,
                    dst_transform=transform,
                    dst_crs=target_crs,
                    resampling=Resampling.nearest,
                )
        valid = np.isfinite(target["B04"]) & (target["B04"] > 0) & np.isin(scene_class, list(VALID_SCL))
        if not valid.any():
            raise ValueError("No valid, cloud-free Sentinel-2 pixels remain in the selected Pune window")
        bands = {}
        for name, source_name in zip(("blue", "green", "red", "nir", "swir"), BANDS):
            values = target[source_name] / 10000.0
            fill = float(np.median(values[valid]))
            # Sentinel reflectance is quantized at 1e-4 precision. Keeping the
            # scaled integer samples halves the raster size versus float32 and
            # satellite_service.load() restores normalized float values.
            bands[name] = np.rint(np.where(valid, np.clip(values, 0, 1), fill) * 10000).astype("uint16")
        output = os.path.join(output_directory, f"{metadata['external_scene_id']}.npz")
        np.savez_compressed(output, **bands)
        upper_left = xy(transform, 0, 0, offset="ul")
        lon, lat = transform_coords(target_crs, "EPSG:4326", [upper_left[0]], [upper_left[1]])
        return output, round(float((~valid).mean() * 100), 3), (lon[0], lat[0])


def rasterio_band(dataset):
    """Pass a lazy raster band to GDAL so COG reads only the grid's source window."""
    import rasterio
    return rasterio.band(dataset, 1)


def compact_npz(source_path, output_path):
    """Write a browser-friendlier integer NPZ while preserving the 1e-4 reflectance scale."""
    with np.load(source_path, allow_pickle=False) as source:
        missing = set(("blue", "green", "red", "nir", "swir")) - set(source.files)
        if missing:
            raise ValueError(f"NPZ scene is missing required bands: {', '.join(sorted(missing))}")
        with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            for name in ("blue", "green", "red", "nir", "swir"):
                values = source[name]
                if np.issubdtype(values.dtype, np.floating):
                    scaled = values if values.max(initial=0) > 1.5 else values * 10000
                    values = np.rint(np.clip(scaled, 0, 10000)).astype("uint16")
                with archive.open(f"{name}.npy", "w") as entry:
                    np.lib.format.write_array(entry, values, allow_pickle=False)
