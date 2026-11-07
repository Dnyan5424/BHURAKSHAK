"""Independent single-grid satellite jobs."""
import json
import os
from datetime import datetime, timedelta

import requests
from shapely.geometry import shape

from .. import services as sv
from ..database import S
from ..models import MonitoringGrid, MonitoringJob, Scene
from ..utils.helpers import BASE
from .gis_service import load_context_layers
from . import planetary_computer_service as pc


def _set(session, job, grid, status, message=None):
    job.status = status
    job.message = message
    if status == "searching":
        job.started_at = datetime.utcnow()
    if status in {"completed", "no_change", "insufficient_data", "failed"}:
        job.completed_at = datetime.utcnow()
        grid.status = "Completed" if status in {"completed", "no_change"} else "Failed"
    else:
        grid.status = "Processing"
    session.commit()


def run_grid_job(job_id):
    session = S()
    job = None
    grid = None
    try:
        job = session.get(MonitoringJob, job_id)
        grid = session.get(MonitoringGrid, job.grid_id) if job else None
        if not job or not grid:
            return
        geometry = shape(json.loads(grid.geometry_geojson))
        _set(session, job, grid, "searching", "Searching Sentinel-2 L2A scenes for this grid.")
        end = datetime.utcnow().date()
        items = pc.search((end - timedelta(days=730)).isoformat(), end.isoformat(), max_cloud_cover=20, limit=6, geometry=geometry.__geo_interface__)
        if len(items) < 2:
            _set(session, job, grid, "insufficient_data", "Fewer than two suitable Sentinel-2 observations cover this grid.")
            return
        after_item = max(items, key=lambda item: item["scene_date"])
        older_items = [item for item in items if item["scene_date"] < after_item["scene_date"]]
        if not older_items:
            _set(session, job, grid, "insufficient_data", "No older baseline scene is available for the latest observation.")
            return
        before_item = min(older_items, key=lambda item: (item["cloud_cover_percent"], item["scene_date"]))
        if before_item["scene_date"] >= after_item["scene_date"]:
            _set(session, job, grid, "insufficient_data", "No older baseline and newer observation pair is available.")
            return
        _set(session, job, grid, "downloading", "Downloading only the selected baseline and latest grid windows.")
        selected = []
        for index, (item, image_type) in enumerate(((before_item, "before"), (after_item, "after")), start=1):
            item["study_area_name"] = grid.grid_id
            scene = session.query(Scene).filter_by(external_scene_id=item["external_scene_id"]).first()
            if not scene:
                scene = Scene(external_scene_id=item["external_scene_id"])
                session.add(scene)
            scene.study_area_name = grid.grid_id
            scene.image_type = image_type
            scene.scene_date = item["scene_date"]
            scene.acquisition_date = item["acquisition_date"]
            scene.source = "Microsoft Planetary Computer / Sentinel-2 L2A"
            scene.provider = item["provider"]
            scene.source_type = "real"
            scene.sensor = item["sensor"]
            scene.cloud_cover_percent = item["cloud_cover_percent"]
            scene.spatial_resolution = item["spatial_resolution"]
            scene.tile_id = item["tile_id"]
            scene.provider_metadata = json.dumps(item, separators=(",", ":"))
            if scene.download_status != "complete" or not scene.image_url or not os.path.exists(scene.image_url):
                _set(session, job, grid, "downloading", f"Downloading {image_type} scene {index} of 2 for this grid.")
                output, masked_percent, origin = pc.download_scene(
                    item, os.path.join(BASE, "data", "raw", "satellite", "automatic", grid.grid_id)
                )
                item["analysis_origin"] = origin
                scene.image_url = output
                scene.raster_paths = json.dumps({"npz": output, "masked_percent": masked_percent})
                scene.provider_metadata = json.dumps(item, separators=(",", ":"))
                scene.download_status = "complete"
                scene.processing_status = "ready"
            selected.append(scene)
            session.flush()
        job.before_scene_id, job.after_scene_id = selected[0].id, selected[1].id
        _set(session, job, grid, "detecting", "Running change detection inside this grid polygon.")
        layers = load_context_layers()
        before_bands, _ = sv.load(selected[0].image_url)
        after_bands, _ = sv.load(selected[1].image_url)
        min_lon, _, _, max_lat = geometry.bounds
        rows = sv.run_detection(session, before_bands, after_bands, (min_lon, max_lat), layers, selected[0].id, selected[1].id, boundary=geometry.__geo_interface__)
        _set(session, job, grid, "completed" if rows else "no_change", f"Grid analysis created {len(rows)} incident(s).")
    except (OSError, requests.RequestException, ValueError, KeyError, RuntimeError, json.JSONDecodeError) as exc:
        if job and grid:
            _set(session, job, grid, "failed", str(exc))
    finally:
        session.close()


def run_grid_scene_comparison(job_id):
    """Download a selected scene pair and compare it in a background worker."""
    session = S()
    job = grid = None
    try:
        job = session.get(MonitoringJob, job_id)
        grid = session.get(MonitoringGrid, job.grid_id) if job else None
        if not job or not grid:
            return
        before, after = session.get(Scene, job.before_scene_id), session.get(Scene, job.after_scene_id)
        if not before or not after:
            raise ValueError("Selected satellite scenes are unavailable")
        geometry = shape(json.loads(grid.geometry_geojson))
        output_directory = os.path.join(BASE, "data", "raw", "satellite", "manual", grid.grid_id)
        selected = []
        _set(session, job, grid, "searching", "Preparing the selected Sentinel-2 pair for this grid.")
        _set(session, job, grid, "downloading", "Downloading and clipping the selected Sentinel-2 scenes to this grid.")
        for index, (scene, image_type) in enumerate(((before, "baseline"), (after, "recent")), start=1):
            metadata = json.loads(scene.provider_metadata or "{}")
            metadata["geometry"] = geometry.__geo_interface__
            if scene.download_status != "complete" or not scene.image_url or not os.path.exists(scene.image_url):
                _set(session, job, grid, "downloading", f"Downloading selected {image_type} image {index} of 2.")
                output, masked_percent, origin = pc.download_scene(metadata, output_directory)
                metadata["analysis_origin"] = origin
                scene.image_url = output
                scene.raster_paths = json.dumps({"npz": output, "masked_percent": masked_percent})
                scene.download_status = "complete"
                scene.processing_status = "ready"
                scene.provider_metadata = json.dumps(metadata, separators=(",", ":"))
                session.commit()
            selected.append(scene)
        layers = load_context_layers()
        before_bands, _ = sv.load(selected[0].image_url)
        after_bands, _ = sv.load(selected[1].image_url)
        metadata = json.loads(selected[1].provider_metadata or "{}")
        origin = metadata.get("analysis_origin")
        if not origin:
            raise ValueError("The selected scene is missing its analysis georeference")
        _set(session, job, grid, "detecting", "Running change detection within the selected 1 km grid.")
        rows = sv.run_detection(session, before_bands, after_bands, tuple(origin), layers,
            selected[0].id, selected[1].id, boundary=geometry.__geo_interface__)
        selected[0].processing_status = selected[1].processing_status = "processed"
        session.commit()
        _set(session, job, grid, "completed" if rows else "no_change", f"Grid analysis created {len(rows)} incident(s).")
    except Exception as exc:
        if job and grid:
            _set(session, job, grid, "failed", str(exc))
    finally:
        session.close()
