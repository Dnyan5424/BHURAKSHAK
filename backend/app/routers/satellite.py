import json
import os
import requests
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse, Response
from starlette.background import BackgroundTask

from ..models import AcquisitionUsage, AutomaticFetchConfig, Case, MonitoringGrid, MonitoringJob, Scene
from ..schemas import SatelliteDownloadIn, SatelliteProcessIn, SatelliteSearchIn
from ..security import db, need
from ..services import planetary_computer_service as pc
from ..services.gis_service import load_context_layers
from ..services.grid_jobs import run_grid_scene_comparison
from .. import services as sv
from ..utils.helpers import BASE

router = APIRouter()


def _scene_out(scene):
    metadata = json.loads(scene.provider_metadata) if scene.provider_metadata else {}
    return {
        "id": scene.id,
        "external_scene_id": scene.external_scene_id,
        "provider": scene.provider,
        "source_type": scene.source_type,
        "study_area_name": scene.study_area_name,
        "scene_date": scene.scene_date,
        "acquisition_date": scene.acquisition_date,
        "cloud_cover_percent": scene.cloud_cover_percent,
        "tile_id": scene.tile_id,
        "download_status": scene.download_status,
        "processing_status": scene.processing_status,
        "image_type": scene.image_type,
        "provider_metadata": metadata,
    }


def _upsert(session, item, image_type="after"):
    scene = session.query(Scene).filter_by(external_scene_id=item["external_scene_id"]).first()
    if not scene:
        scene = Scene(external_scene_id=item["external_scene_id"])
        session.add(scene)
    scene.study_area_name = item["study_area_name"]
    scene.image_type = scene.image_type if scene.image_type in {"before", "after"} else image_type
    scene.scene_date = item["scene_date"]
    scene.acquisition_date = item["acquisition_date"]
    scene.source = "Microsoft Planetary Computer / Sentinel-2 L2A"
    scene.provider = item["provider"]
    scene.source_type = "real"
    scene.sensor = item["sensor"]
    scene.cloud_cover_percent = item["cloud_cover_percent"]
    scene.spatial_resolution = item["spatial_resolution"]
    scene.tile_id = item["tile_id"]
    scene.download_status = scene.download_status or "discovered"
    scene.provider_metadata = json.dumps(item, separators=(",", ":"))
    return scene


@router.post("/api/satellite/search")
def search(r: SatelliteSearchIn, u=Depends(need("officer", "admin")), s=Depends(db)):
    try:
        datetime.strptime(r.start_date, "%Y-%m-%d")
        datetime.strptime(r.end_date, "%Y-%m-%d")
        if r.start_date > r.end_date:
            raise ValueError("start_date must be before end_date")
        items = pc.search(r.start_date, r.end_date, r.max_cloud_cover, r.limit, r.geometry)
    except requests.RequestException as exc:
        raise HTTPException(502, "The public Sentinel-2 catalogue could not be reached. Try the search again.") from exc
    except (ValueError, OSError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc
    scenes = [_upsert(s, item) for item in items]
    s.commit()
    return {"boundary": "Pune district (OpenStreetMap administrative boundary)" if r.geometry is None else "Custom Pune-area geometry", "results": [_scene_out(scene) for scene in scenes]}


@router.post("/api/monitoring-grids/{grid_id}/catalog")
def grid_catalog(grid_id: str, r: SatelliteSearchIn, u=Depends(need("officer", "admin")), s=Depends(db)):
    grid = s.query(MonitoringGrid).filter_by(grid_id=grid_id, active=True, grid_size_m=1000).first()
    if not grid:
        raise HTTPException(404, "1 km monitoring grid not found")
    try:
        datetime.strptime(r.start_date, "%Y-%m-%d")
        datetime.strptime(r.end_date, "%Y-%m-%d")
        if r.start_date > r.end_date:
            raise ValueError("start_date must be before end_date")
        geometry = json.loads(grid.geometry_geojson)
        items = pc.search(r.start_date, r.end_date, min(r.max_cloud_cover, 20), min(r.limit, 6), geometry)
    except requests.RequestException as exc:
        raise HTTPException(502, "The Sentinel-2 catalogue could not be reached.") from exc
    except (ValueError, OSError, RuntimeError, json.JSONDecodeError) as exc:
        raise HTTPException(422, str(exc)) from exc
    scenes = []
    for item in items:
        item["study_area_name"] = grid.grid_id
        scenes.append(_upsert(s, item))
    s.commit()
    return {"grid_id": grid.grid_id, "municipality": grid.municipality, "results": [_scene_out(scene) for scene in scenes]}


@router.post("/api/monitoring-grids/{grid_id}/detect", status_code=202)
def queue_grid_scene_comparison(
    grid_id: str,
    r: SatelliteProcessIn,
    background_tasks: BackgroundTasks,
    u=Depends(need("officer", "admin")),
    s=Depends(db),
):
    grid = s.query(MonitoringGrid).filter_by(grid_id=grid_id, active=True, grid_size_m=1000).first()
    if not grid:
        raise HTTPException(404, "1 km monitoring grid not found")
    before, after = s.get(Scene, r.before_scene_id), s.get(Scene, r.after_scene_id)
    if not before or not after or before.source_type != "real" or after.source_type != "real":
        raise HTTPException(422, "Select two real Sentinel-2 scenes from the catalogue")
    if before.study_area_name != grid.grid_id or after.study_area_name != grid.grid_id:
        raise HTTPException(422, "Both scenes must have been searched for the selected grid")
    if before.scene_date >= after.scene_date:
        raise HTTPException(422, "The baseline scene must be older than the recent scene")
    if before.tile_id != after.tile_id:
        raise HTTPException(422, "Select scenes from the same Sentinel-2 tile")
    if max(before.cloud_cover_percent or 0, after.cloud_cover_percent or 0) > r.max_cloud_cover_percent:
        raise HTTPException(422, "Selected scenes exceed the cloud-cover threshold")
    active = s.query(MonitoringJob).filter(MonitoringJob.grid_id == grid.id, MonitoringJob.status.in_(
        ["queued", "searching", "downloading", "detecting"]
    )).first()
    if active:
        return {"job_id": active.id, "grid_id": grid_id, "status": active.status, "message": "An analysis job is already running for this grid."}
    job = MonitoringJob(grid_id=grid.id, requested_by=u.id, before_scene_id=before.id,
        after_scene_id=after.id, status="queued", message="Selected-scene comparison queued.")
    s.add(job)
    s.flush()
    grid.last_job_id = job.id
    grid.status = "Processing"
    s.commit()
    background_tasks.add_task(run_grid_scene_comparison, job.id)
    return {"job_id": job.id, "grid_id": grid_id, "status": job.status}


@router.get("/api/monitoring-grids/{grid_id}/catalog")
def download_grid_catalog(grid_id: str, format: str = "csv", u=Depends(need("officer", "admin")), s=Depends(db)):
    grid = s.query(MonitoringGrid).filter_by(grid_id=grid_id, active=True, grid_size_m=1000).first()
    if not grid:
        raise HTTPException(404, "1 km monitoring grid not found")
    scenes = s.query(Scene).filter_by(study_area_name=grid.grid_id).order_by(Scene.scene_date).all()
    rows = [_scene_out(scene) for scene in scenes]
    if format == "geojson":
        return {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature", "geometry": json.loads(grid.geometry_geojson),
                "properties": {key: value for key, value in row.items() if key != "provider_metadata"},
            } for row in rows],
        }
    if format != "csv":
        raise HTTPException(422, "format must be csv or geojson")
    columns = ("external_scene_id", "scene_date", "acquisition_date", "cloud_cover_percent", "provider", "sensor", "spatial_resolution", "download_status")
    lines = [",".join(columns)]
    for row in rows:
        lines.append(",".join(json.dumps(str(row.get(column, ""))) for column in columns))
    return Response("\n".join(lines), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{grid_id}-catalog.csv"'})


@router.post("/api/satellite/scenes/{scene_id}/download")
def download(scene_id: int, r: SatelliteDownloadIn, u=Depends(need("officer", "admin")), s=Depends(db)):
    scene = s.get(Scene, scene_id)
    if not scene or scene.source_type != "real" or not scene.provider_metadata:
        raise HTTPException(404, "Real discovered satellite scene not found")
    if r.image_type not in {"before", "after"}:
        raise HTTPException(422, "image_type must be 'before' or 'after'")
    if scene.download_status == "complete" and scene.image_url and os.path.exists(scene.image_url):
        scene.image_type = r.image_type
        s.commit()
        return _scene_out(scene)
    metadata = json.loads(scene.provider_metadata)
    if r.mode not in {"manual", "historical", "automatic"}:
        raise HTTPException(422, "mode must be manual, historical, or automatic")
    if r.mode == "manual" and u.role == "officer":
        config = s.query(AutomaticFetchConfig).first()
        limit = config.manual_jobs_limit if config and config.manual_jobs_limit is not None else 5
        today = datetime.utcnow().date().isoformat()
        usage = s.query(AcquisitionUsage).filter_by(user_id=u.id, usage_date=today).first()
        if not usage:
            usage = AcquisitionUsage(user_id=u.id, usage_date=today, manual_jobs=0)
            s.add(usage)
        if limit > 0 and usage.manual_jobs >= limit:
            raise HTTPException(429, f"Manual satellite processing limit reached: maximum {limit} jobs per officer per day.")
        usage.manual_jobs += 1
        s.flush()
    folder = r.mode
    output_directory = os.path.join(BASE, "data", "raw", "satellite", folder)
    scene.download_status = "downloading"
    scene.image_type = r.image_type
    s.commit()
    try:
        output, masked_percent, origin = pc.download_scene(metadata, output_directory)
    except (OSError, ValueError, RuntimeError) as exc:
        scene.download_status = "failed"
        s.commit()
        raise HTTPException(422, str(exc)) from exc
    scene.image_url = output
    scene.raster_paths = json.dumps({"npz": output, "masked_percent": masked_percent})
    metadata["analysis_origin"] = origin
    scene.provider_metadata = json.dumps(metadata, separators=(",", ":"))
    scene.download_status = "complete"
    scene.processing_status = "ready"
    s.commit()
    return _scene_out(scene)


@router.get("/api/satellite/scenes/{scene_id}/preview")
def preview(scene_id: int, s=Depends(db)):
    scene = s.get(Scene, scene_id)
    if not scene or not scene.provider_metadata:
        raise HTTPException(404, "Satellite scene not found")
    return RedirectResponse(
        "https://planetarycomputer.microsoft.com/api/data/v1/item/preview.png"
        f"?collection=sentinel-2-l2a&item={scene.external_scene_id}&assets=visual"
        "&asset_bidx=visual%7C1,2,3&nodata=0&format=png"
    )


@router.get("/api/satellite/scenes/{scene_id}/image")
def image(scene_id: int, u=Depends(need("officer", "admin")), s=Depends(db)):
    scene = s.get(Scene, scene_id)
    if not scene or not scene.provider_metadata:
        raise HTTPException(404, "Satellite scene not found")
    metadata = json.loads(scene.provider_metadata)
    href = metadata.get("assets", {}).get("visual")
    if not href:
        raise HTTPException(404, "Provider visual asset is unavailable")
    try:
        from ..services.planetary_computer_service import _signed
        return RedirectResponse(_signed(href))
    except (OSError, RuntimeError) as exc:
        raise HTTPException(502, "Could not sign the provider image asset") from exc


@router.get("/api/satellite/scenes/{scene_id}/npz")
def npz(scene_id: int, u=Depends(need("officer", "admin")), s=Depends(db)):
    scene = s.get(Scene, scene_id)
    if not scene or not scene.image_url or not os.path.exists(scene.image_url):
        raise HTTPException(404, "Download and convert this scene before downloading its NPZ")
    if os.path.getsize(scene.image_url) > 100 * 1024 * 1024:
        directory = os.path.join(BASE, "data", "raw", "satellite", "downloads")
        os.makedirs(directory, exist_ok=True)
        compact_path = os.path.join(directory, f"{uuid.uuid4().hex}.npz")
        try:
            pc.compact_npz(scene.image_url, compact_path)
        except (OSError, ValueError, EOFError) as exc:
            if os.path.exists(compact_path):
                os.remove(compact_path)
            raise HTTPException(422, "Could not prepare this large NPZ download. Try again or reacquire the scene.") from exc
        return FileResponse(
            compact_path,
            media_type="application/octet-stream",
            filename=f"{scene.external_scene_id}.npz",
            background=BackgroundTask(os.remove, compact_path),
        )
    return FileResponse(
        scene.image_url,
        media_type="application/octet-stream",
        filename=f"{scene.external_scene_id}.npz",
    )


@router.post("/api/satellite/process")
def process(r: SatelliteProcessIn, u=Depends(need("officer", "admin")), s=Depends(db)):
    before, after = s.get(Scene, r.before_scene_id), s.get(Scene, r.after_scene_id)
    if not before or not after or before.source_type != "real" or after.source_type != "real":
        raise HTTPException(422, "Select two downloaded real satellite scenes")
    if before.scene_date >= after.scene_date:
        raise HTTPException(422, "The baseline scene must be older than the recent scene")
    if before.tile_id != after.tile_id:
        raise HTTPException(422, "Select scenes from the same Sentinel-2 tile so their pixels cover the same ground area")
    if max(before.cloud_cover_percent or 0, after.cloud_cover_percent or 0) > r.max_cloud_cover_percent:
        raise HTTPException(422, "Selected scenes exceed the cloud-cover threshold")
    if not before.image_url or not after.image_url or not os.path.exists(before.image_url) or not os.path.exists(after.image_url):
        raise HTTPException(422, "Download both selected scenes before processing")
    before_metadata = json.loads(before.provider_metadata or "{}")
    after_metadata = json.loads(after.provider_metadata or "{}")
    origin = after_metadata.get("analysis_origin") or before_metadata.get("analysis_origin")
    if not origin:
        raise HTTPException(422, "The selected scene is missing its analysis georeference")
    layers = load_context_layers()
    try:
        before_bands, _ = sv.load(before.image_url)
        after_bands, _ = sv.load(after.image_url)
        rows = sv.run_detection(s, before_bands, after_bands, tuple(origin), layers, before.id, after.id)
    except (OSError, ValueError, KeyError) as exc:
        raise HTTPException(422, f"Real satellite processing failed: {exc}") from exc
    before.processing_status = after.processing_status = "processed"
    s.commit()
    case_ids = [
        case.id for detection in rows
        if (case := s.query(Case).filter_by(change_detection_id=detection.id).first()) is not None
    ]
    return {
        "created": [row.id for row in rows],
        "case_ids": case_ids,
        "message": f"Processed real scenes {before.external_scene_id} and {after.external_scene_id}.",
    }
