import json
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .. import services as sv
from ..models import AutomaticFetchConfig, Case, Detection, Notification, Scene, User
from ..utils.helpers import BASE
from .gis_service import load_context_layers
from . import planetary_computer_service as pc


def _config(session):
    config = session.query(AutomaticFetchConfig).first()
    if not config:
        config = AutomaticFetchConfig(frequency_minutes=60, enabled=True)
        session.add(config)
        session.commit()
    return config


def run_latest_review(session):
    config = _config(session)
    scenes = session.query(Scene).order_by(Scene.scene_date.desc()).all()
    after = next((scene for scene in scenes if scene.image_type == "after"), None)
    before = next(
        (scene for scene in scenes if scene.image_type == "before"
         and after and scene.study_area_name == after.study_area_name
         and scene.sensor == after.sensor
         and scene.spatial_resolution == after.spatial_resolution
         and scene.scene_date < after.scene_date),
        None,
    )
    if not before or not after:
        return {"created": [], "message": "A matching baseline and latest scene are required."}
    pair = f"{before.id}:{after.id}"
    if config.last_pair == pair:
        return {"created": [], "message": "The latest scene pair has already been reviewed."}

    layers = load_context_layers()
    before_bands, before_warning = sv.load(before.image_url)
    after_bands, after_warning = sv.load(after.image_url)
    before_metadata = json.loads(before.provider_metadata or "{}")
    after_metadata = json.loads(after.provider_metadata or "{}")
    origin = after_metadata.get("analysis_origin") or before_metadata.get("analysis_origin") or layers.get("origin")
    if not origin:
        return {"created": [], "message": "The selected scenes do not include an analysis georeference."}
    rows = sv.run_detection(session, before_bands, after_bands, tuple(origin), layers, before.id, after.id)
    config.last_pair = pair
    config.last_run_at = datetime.utcnow()
    session.commit()
    if rows:
        officers = session.query(User).filter(User.role.in_(["officer", "admin"])).all()
        for row in rows:
            case = session.query(Case).filter_by(change_detection_id=row.id).first()
            for officer in officers:
                if officer.mobile:
                    session.add(Notification(
                        mobile=officer.mobile,
                        message=f"Automatic review alert: {row.change_type} detected in {after.study_area_name} ({row.risk_level} risk). Case #{case.id}.",
                    ))
        session.commit()
    return {"created": [row.id for row in rows], "warning": before_warning or after_warning,
            "message": f"Automatic review completed with {len(rows)} new observation(s)."}


def run_area_review(session, area):
    """Run the existing detector for one persisted area; never reports success without a scene pair."""
    from shapely.geometry import shape

    scenes = session.query(Scene).filter(Scene.study_area_name == area.name).order_by(Scene.scene_date.asc()).all()
    before = next((item for item in scenes if item.image_type == "before"), None)
    after = next((item for item in reversed(scenes) if item.image_type == "after"), None)
    if not before or not after:
        return {"status": "insufficient_data", "created": [], "message": "No suitable before/after observations exist for this area."}
    if before.scene_date >= after.scene_date:
        return {"status": "insufficient_data", "created": [], "message": "The area does not have an older baseline and a newer observation."}
    existing = session.query(Detection).filter_by(before_scene_id=before.id, after_scene_id=after.id).all()
    if existing:
        return {
            "status": "completed",
            "created": [row.id for row in existing],
            "case_ids": [case.id for row in existing if (case := session.query(Case).filter_by(change_detection_id=row.id).first())],
            "message": f"Existing analysis reused for {area.name}; no duplicate incidents were created.",
        }
    if not before.image_url or not after.image_url or not os.path.exists(before.image_url) or not os.path.exists(after.image_url):
        return {"status": "insufficient_data", "created": [], "message": "The selected area scenes are not available as compact local rasters."}
    layers = load_context_layers()
    try:
        before_bands, before_warning = sv.load(before.image_url)
        after_bands, after_warning = sv.load(after.image_url)
        geometry = shape(json.loads(area.geometry_geojson)) if area.geometry_geojson else None
        if geometry is None or geometry.is_empty or not geometry.is_valid:
            return {"status": "failed", "created": [], "message": "The selected area has no valid saved boundary."}
        min_lon, _, _, max_lat = geometry.bounds
        rows = sv.run_detection(
            session, before_bands, after_bands, (min_lon, max_lat), layers,
            before.id, after.id, boundary=geometry.__geo_interface__,
        )
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        return {"status": "failed", "created": [], "message": f"Area analysis failed: {exc}"}
    after.processing_status = "processed"
    session.commit()
    return {
        "status": "completed" if rows else "no_change",
        "created": [row.id for row in rows],
        "case_ids": [case.id for row in rows if (case := session.query(Case).filter_by(change_detection_id=row.id).first())],
        "warning": before_warning or after_warning,
        "message": f"Automatic analysis completed for {area.name}: {len(rows)} incident(s) created.",
    }


def run_scheduled_review():
    from ..database import S
    session = S()
    try:
        config = _config(session)
        if not config.enabled:
            return {"created": [], "message": "Automatic review is disabled."}
        result = discover_daily(session)
        if result["discovered"] or result["downloaded"]:
            return result
        return run_latest_review(session)
    finally:
        # Record every attempt, including empty searches and provider errors,
        # so the scheduler honors the configured interval instead of retrying each minute.
        try:
            config = session.query(AutomaticFetchConfig).first()
            if config:
                config.last_run_at = datetime.utcnow()
                session.commit()
        except Exception:
            session.rollback()
        session.close()


def _upsert_discovery(session, item):
    scene = session.query(Scene).filter_by(external_scene_id=item["external_scene_id"]).first()
    if not scene:
        scene = Scene(external_scene_id=item["external_scene_id"], image_type="after")
        session.add(scene)
    scene.study_area_name = item["study_area_name"]
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
    if not scene.download_status:
        scene.download_status = "discovered"
    return scene


def discover_daily(session):
    """Run one provider discovery after 06:00 IST and process at most two scenes."""
    now = datetime.now(ZoneInfo("Asia/Kolkata"))
    today = now.date().isoformat()
    config = _config(session)
    if now.hour < 6 or config.last_discovery_date == today:
        return {"discovered": 0, "downloaded": 0, "created": [], "message": "Daily discovery is not due."}
    start = (now.date() - timedelta(days=3)).isoformat()
    items = pc.search(start, today, max_cloud_cover=30, limit=20)
    scenes = [_upsert_discovery(session, item) for item in items]
    config.last_discovery_date = today
    if config.automatic_jobs_date != today:
        config.automatic_jobs_date, config.automatic_jobs_count = today, 0
    session.commit()
    downloaded = 0
    for scene in sorted(scenes, key=lambda row: (row.cloud_cover_percent, row.scene_date)):
        if downloaded >= 2 or config.automatic_jobs_count >= 2:
            break
        if scene.download_status == "complete":
            continue
        metadata = json.loads(scene.provider_metadata)
        try:
            output, masked_percent, origin = pc.download_scene(
                metadata, os.path.join(BASE, "data", "raw", "satellite", "automatic")
            )
        except (OSError, ValueError, RuntimeError):
            scene.download_status = "failed"
            continue
        metadata["analysis_origin"] = origin
        scene.image_url = output
        scene.raster_paths = json.dumps({"npz": output, "masked_percent": masked_percent})
        scene.provider_metadata = json.dumps(metadata, separators=(",", ":"))
        scene.download_status, scene.processing_status = "complete", "ready"
        config.automatic_jobs_count += 1
        downloaded += 1
    session.commit()
    return {
        "discovered": len(scenes),
        "downloaded": downloaded,
        "created": [],
        "message": f"Daily provider discovery found {len(scenes)} Pune scene(s) and downloaded {downloaded}.",
    }
