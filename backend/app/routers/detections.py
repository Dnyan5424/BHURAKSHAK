import io
import json
import os
import uuid
from datetime import datetime

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from shapely.geometry import shape

from .. import services as sv
from ..models import Case, Detection, Gis, Scene
from ..schemas import RunReq
from ..security import db, need
from ..utils.helpers import BASE, D

router = APIRouter()
MAX_SCENE_BYTES = 200 * 1024 * 1024
SCENE_EXTENSIONS = {".npz", ".tif", ".tiff"}
SUPPORTED_SENSORS = {"Sentinel-2", "Landsat 8", "Landsat 9"}


@router.get("/api/change-detections")
def dets(s=Depends(db)):
    return [D(d) for d in s.query(Detection).all()]


@router.get("/api/change-detections/{i}")
def det(i: int, s=Depends(db)):
    detection = s.get(Detection, i)
    if not detection:
        raise HTTPException(404, "Detection not found")
    result = D(detection, s.query(Gis).filter_by(change_detection_id=i).first())
    result["satellite_observations"] = {
        "before": _scene_metadata(s.get(Scene, detection.before_scene_id)),
        "after": _scene_metadata(s.get(Scene, detection.after_scene_id)),
    }
    return result


def _scene_metadata(scene):
    if not scene:
        return None
    return {
        "id": scene.id,
        "study_area_name": scene.study_area_name,
        "scene_date": scene.scene_date,
        "source": scene.source,
        "sensor": scene.sensor,
        "cloud_cover_percent": scene.cloud_cover_percent,
        "spatial_resolution": scene.spatial_resolution,
    }


@router.get("/api/change-detections/{i}/evidence")
def evid(i: int, s=Depends(db)):
    detection = det(i, s)
    return {key: detection[key] for key in ("why_flagged", "ndvi_difference", "ndwi_difference", "ndbi_difference", "bsi_difference", "confidence", "disclaimer")}


@router.get("/api/change-detections/{i}/gis-context")
def gctx(i: int, s=Depends(db)):
    return det(i, s).get("gis")


@router.post("/api/scenes/upload")
async def upload(
    study_area_name: str = Form(...),
    image_type: str = Form(...),
    scene_date: str = Form(...),
    sensor: str = Form("Sentinel-2"),
    cloud_cover_percent: float = Form(0),
    source: str = Form("Copernicus Data Space"),
    spatial_resolution: str = Form("10 m"),
    file: UploadFile = File(...),
    u=Depends(need("admin")),
    s=Depends(db),
):
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in SCENE_EXTENSIONS:
        raise HTTPException(415, "Upload a supported .npz, .tif, or .tiff raster scene")
    if image_type not in {"before", "after"}:
        raise HTTPException(422, "image_type must be 'before' or 'after'")
    if sensor not in SUPPORTED_SENSORS:
        raise HTTPException(422, "Choose a supported Sentinel or Landsat sensor")
    if not 0 <= cloud_cover_percent <= 100:
        raise HTTPException(422, "Cloud cover must be between 0 and 100 percent")
    try:
        datetime.strptime(scene_date, "%Y-%m-%d")
    except ValueError as exc:
        raise HTTPException(422, "scene_date must use YYYY-MM-DD format") from exc
    if not study_area_name.strip() or len(study_area_name) > 120:
        raise HTTPException(422, "Enter a study area name of 1–120 characters")
    if not source.strip() or len(source) > 120 or not spatial_resolution.strip() or len(spatial_resolution) > 40:
        raise HTTPException(422, "Enter valid source and spatial-resolution metadata")

    contents = await file.read(MAX_SCENE_BYTES + 1)
    if len(contents) > MAX_SCENE_BYTES:
        raise HTTPException(413, "Scene file must be smaller than 200 MB")

    directory = os.path.join(BASE, "data", "raw")
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, f"scene_{uuid.uuid4().hex}{extension}")
    try:
        with open(path, "wb") as scene_file:
            scene_file.write(contents)
        bands, warning = sv.load(path)
    except (ValueError, KeyError, OSError) as exc:
        if os.path.exists(path):
            os.remove(path)
        raise HTTPException(422, "Could not read this satellite raster. Upload a valid multiband .npz or GeoTIFF.") from exc

    scene = Scene(
        study_area_name=study_area_name.strip(),
        image_type=image_type,
        scene_date=scene_date,
        source=source.strip(),
        sensor=sensor,
        cloud_cover_percent=cloud_cover_percent,
        spatial_resolution=spatial_resolution.strip(),
        image_url=path,
    )
    s.add(scene)
    s.commit()
    return {"scene_id": scene.id, "warning": warning}


@router.post("/api/change-detection/run")
def run(r: RunReq, u=Depends(need("admin")), s=Depends(db)):
    if r.before_scene_id == r.after_scene_id:
        raise HTTPException(422, "Choose two different scenes for comparison")
    before, after = s.get(Scene, r.before_scene_id), s.get(Scene, r.after_scene_id)
    if not before or not after:
        raise HTTPException(404, "One or both selected satellite scenes were not found")
    if before.image_type != "before" or after.image_type != "after":
        raise HTTPException(422, "Choose a baseline scene and a recent scene in the correct order")
    if before.scene_date >= after.scene_date:
        raise HTTPException(422, "The recent scene date must be after the baseline scene date")
    if (before.study_area_name, before.sensor, before.spatial_resolution) != (
        after.study_area_name, after.sensor, after.spatial_resolution
    ):
        raise HTTPException(422, "Selected scenes must have matching study area, sensor, and spatial resolution")
    if max(before.cloud_cover_percent or 0, after.cloud_cover_percent or 0) > r.max_cloud_cover_percent:
        raise HTTPException(422, "Selected scenes exceed the cloud-cover threshold")
    analysis_boundary = None
    if r.boundary is not None:
        try:
            analysis_boundary = shape(r.boundary)
            if analysis_boundary.geom_type not in {"Polygon", "MultiPolygon"} or analysis_boundary.is_empty or not analysis_boundary.is_valid:
                raise ValueError("Invalid polygon geometry")
            min_lon, min_lat, max_lon, max_lat = analysis_boundary.bounds
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(422, "Analysis boundary must be a valid GeoJSON Polygon or MultiPolygon") from exc
        if min_lon < -180 or max_lon > 180 or min_lat < -90 or max_lat > 90:
            raise HTTPException(422, "Analysis boundary coordinates must be valid longitude and latitude values")
        if abs(r.origin_lon - min_lon) > 1e-7 or abs(r.origin_lat - max_lat) > 1e-7:
            raise HTTPException(422, "Analysis origin must match the polygon's upper-left coordinate")

    try:
        before_bands, before_warning = sv.load(before.image_url)
        after_bands, after_warning = sv.load(after.image_url)
    except (ValueError, KeyError, OSError) as exc:
        raise HTTPException(422, "Could not read the selected scenes. Re-upload compatible five-band rasters.") from exc
    if analysis_boundary is not None:
        from shapely.geometry import box

        height, width = before_bands["red"].shape
        raster_bounds = box(
            r.origin_lon,
            r.origin_lat - height * 9e-5,
            r.origin_lon + width * 9e-5,
            r.origin_lat,
        )
        if not analysis_boundary.intersects(raster_bounds):
            raise HTTPException(422, "The selected polygon does not overlap the raster analysis extent")

    layers_path = os.path.join(BASE, "data", "raw", "demo_layers.json")
    if not os.path.exists(layers_path):
        raise HTTPException(503, "GIS context layers are unavailable")
    with open(layers_path, encoding="utf-8") as layers_file:
        layers = json.load(layers_file)
    rows = sv.run_detection(
        s,
        before_bands,
        after_bands,
        (r.origin_lon, r.origin_lat),
        layers,
        before.id,
        after.id,
        boundary=analysis_boundary.__geo_interface__ if analysis_boundary is not None else None,
    )
    case_ids = [
        case.id for detection in rows
        if (case := s.query(Case).filter_by(change_detection_id=detection.id).first()) is not None
    ]
    return {
        "created": [row.id for row in rows],
        "case_ids": case_ids,
        "warning": before_warning or after_warning,
        "message": "Preliminary detections created for officer review." if rows else "No changes exceeded the configured detection thresholds.",
    }


@router.get("/api/scenes")
def scenes(s=Depends(db)):
    layers_path = os.path.join(BASE, "data", "raw", "demo_layers.json")
    with open(layers_path, encoding="utf-8") as layers_file:
        origin = json.load(layers_file)["origin"]
    count, pixel_size = 120, 9e-5
    return [
        {
            "id": scene.id,
            "study_area_name": scene.study_area_name,
            "image_type": scene.image_type,
            "scene_date": scene.scene_date,
            "source": scene.source,
            "sensor": scene.sensor,
            "cloud_cover_percent": scene.cloud_cover_percent,
            "spatial_resolution": scene.spatial_resolution,
            "preview": f"/api/scenes/{scene.id}/preview",
            "bounds": [[origin[1] - count * pixel_size, origin[0]], [origin[1], origin[0] + count * pixel_size]],
        }
        for scene in s.query(Scene).order_by(Scene.scene_date).all()
    ]


@router.get("/api/scenes/{i}/preview")
def preview(i: int, s=Depends(db)):
    scene = s.get(Scene, i)
    if not scene:
        raise HTTPException(404, "Satellite scene not found")
    try:
        bands, _ = sv.load(scene.image_url)
    except (ValueError, KeyError, OSError) as exc:
        raise HTTPException(422, "Could not read the satellite scene. Re-upload a supported multiband raster.") from exc
    image = (np.clip(np.dstack([bands["nir"], bands["red"], bands["green"]]) / 0.6, 0, 1) * 255).astype("uint8")
    from PIL import Image

    buffer = io.BytesIO()
    Image.fromarray(image).resize((480, 480), Image.NEAREST).save(buffer, "PNG")
    return Response(buffer.getvalue(), media_type="image/png")
