import json
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..models import AcquisitionUsage, AutomaticFetchConfig, Case, Detection, Evidence, MonitoringArea, MonitoringGrid, MonitoringJob, MunicipalWard, Petition, Portal, Scene, User
from ..schemas import AcquisitionLimitIn, AutomaticFetchIn, PortalIn
from ..services.automatic_review import run_area_review, run_latest_review
from ..services.geographic import import_municipality
from ..services.grid_jobs import run_grid_job
from ..security import db, need
from ..utils.helpers import BASE

router = APIRouter()

@router.get("/api/automatic-review")
def automatic_review_settings(u=Depends(need("officer", "admin")), s=Depends(db)):
    config = s.query(AutomaticFetchConfig).first()
    if not config:
        config = AutomaticFetchConfig(frequency_minutes=60, enabled=True)
        s.add(config)
        s.commit()
    return {"frequency_minutes": config.frequency_minutes, "enabled": config.enabled, "last_run_at": config.last_run_at}

@router.put("/api/automatic-review")
def update_automatic_review(r: AutomaticFetchIn, u=Depends(need("officer", "admin")), s=Depends(db)):
    config = s.query(AutomaticFetchConfig).first()
    if not config:
        config = AutomaticFetchConfig()
        s.add(config)
    config.frequency_minutes, config.enabled = r.frequency_minutes, r.enabled
    s.commit()
    return {"frequency_minutes": config.frequency_minutes, "enabled": config.enabled, "last_run_at": config.last_run_at}

@router.post("/api/admin/automatic-review/run")
def run_automatic_review(u=Depends(need("admin")), s=Depends(db)):
    try:
        return run_latest_review(s)
    except (OSError, ValueError, KeyError, RuntimeError) as exc:
        raise HTTPException(422, str(exc)) from exc

def _acquisition_config(s):
    config = s.query(AutomaticFetchConfig).first()
    if not config:
        config = AutomaticFetchConfig(manual_jobs_limit=5)
        s.add(config)
        s.flush()
    if config.manual_jobs_limit is None:
        config.manual_jobs_limit = 5
    return config

@router.get("/api/admin/acquisition-usage")
def acquisition_usage(u=Depends(need("admin")), s=Depends(db)):
    today = datetime.utcnow().date().isoformat()
    config = _acquisition_config(s)
    rows = []
    for officer in s.query(User).filter(User.role == "officer").order_by(User.name):
        usage = s.query(AcquisitionUsage).filter_by(user_id=officer.id, usage_date=today).first()
        used = usage.manual_jobs if usage else 0
        rows.append({
            "user_id": officer.id,
            "name": officer.name,
            "email": officer.email,
            "used": used,
            "limit": config.manual_jobs_limit,
            "remaining": "unlimited" if config.manual_jobs_limit == 0 else max(config.manual_jobs_limit - used, 0),
        })
    s.commit()
    return {"date": today, "manual_jobs_limit": config.manual_jobs_limit, "unlimited": config.manual_jobs_limit == 0, "officers": rows}

@router.put("/api/admin/acquisition-usage")
def update_acquisition_limit(r: AcquisitionLimitIn, u=Depends(need("admin")), s=Depends(db)):
    config = _acquisition_config(s)
    config.manual_jobs_limit = r.manual_jobs_limit
    s.commit()
    return {"manual_jobs_limit": config.manual_jobs_limit, "unlimited": config.manual_jobs_limit == 0}
MAX_EVIDENCE_BYTES = 25 * 1024 * 1024
EVIDENCE_FORMATS = {
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
    ".png": ("image/png", b"\x89PNG\r\n\x1a\n"),
    ".webp": ("image/webp", b"RIFF"),
    ".tif": ("image/tiff", None),
    ".tiff": ("image/tiff", None),
    ".pdf": ("application/pdf", b"%PDF-"),
}


def _evidence_out(item, s):
    uploader = s.get(User, item.uploaded_by) if item.uploaded_by else None
    return {
        "id": item.id,
        "case_id": item.case_id,
        "scene_id": item.scene_id,
        "original_filename": item.original_filename,
        "media_type": item.media_type,
        "evidence_type": item.evidence_type,
        "captured_at": item.captured_at,
        "latitude": item.latitude,
        "longitude": item.longitude,
        "uploaded_by": item.uploaded_by,
        "uploader_name": uploader.name if uploader else None,
        "uploader_role": uploader.role if uploader else None,
        "uploaded_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("/api/admin/dashboard")
def dash(u=Depends(need("admin")), s=Depends(db)):
    detections = s.query(Detection).all()
    open_cases = s.query(Case).filter(Case.officer_decision.is_(None)).count()
    critical_cases = s.query(Detection).filter(Detection.risk_level.in_(["Critical", "High"])).count()
    scenes = s.query(Scene).all()
    study_areas = list(dict.fromkeys(sc.study_area_name for sc in scenes if sc.study_area_name))

    monitoring_areas = []
    for name in study_areas:
        sc = next((sc for sc in scenes if sc.study_area_name == name), None)
        last_date = sc.scene_date if sc else "2026-10-23"
        has_change = any(d.risk_level in ("High", "Critical") for d in detections)
        status = "Change Found" if has_change else "Ready"
        monitoring_areas.append({
            "name": name,
            "last_checked": last_date,
            "status": status,
            "reports_count": s.query(Petition).count(),
            "cases_count": len(detections)
        })

    return {
        "petitions": s.query(Petition).count(),
        "total_reports": s.query(Petition).count(),
        "cases_waiting_officer": open_cases,
        "open_cases": open_cases,
        "critical_cases": critical_cases,
        "satellite_areas_added": len(study_areas),
        "detections": len(detections),
        "total_hectares": round(sum(item.area_hectares for item in detections), 1),
        "by_risk": {level: sum(item.risk_level == level for item in detections) for level in ("Low", "Moderate", "High", "Critical")},
        "monitoring_areas": monitoring_areas
    }

@router.get("/api/admin/monitoring-areas")
def monitoring_areas(u=Depends(need("admin")), s=Depends(db)):
    saved_areas = s.query(MonitoringArea).filter(MonitoringArea.active.is_(True)).order_by(MonitoringArea.id).all()
    if saved_areas:
        scenes = s.query(Scene).order_by(Scene.scene_date.desc(), Scene.id.desc()).all()
        detections = s.query(Detection).order_by(Detection.created_at.desc(), Detection.id.desc()).all()
        result = []
        for area in saved_areas:
            area_scenes = [scene for scene in scenes if scene.study_area_name == area.name]
            scene_ids = {scene.id for scene in area_scenes}
            area_detections = [d for d in detections if d.before_scene_id in scene_ids or d.after_scene_id in scene_ids]
            latest = area_scenes[0] if area_scenes else None
            result.append({
                "id": area.id, "name": area.name, "district": area.district, "area_type": area.area_type,
                "area_sq_km": area.area_sq_km, "geometry": json.loads(area.geometry_geojson),
                "boundary_version": area.boundary_version, "source": area.source, "max_cloud_cover": area.max_cloud_cover,
                "last_checked": latest.scene_date if latest else "—",
                "status": "Change Found" if area_detections else "Ready", "alerts": len(area_detections),
                "recent_incidents": [{
                    "detection_id": d.id,
                    "case_id": (case.id if (case := s.query(Case).filter_by(change_detection_id=d.id).first()) else None),
                    "change_type": d.change_type, "risk_level": d.risk_level, "area_hectares": d.area_hectares,
                    "confidence": d.confidence, "created_at": d.created_at.isoformat() if d.created_at else None,
                } for d in area_detections[:10]],
            })
        return result
    scenes = s.query(Scene).order_by(Scene.scene_date.desc(), Scene.id.desc()).all()
    detections = s.query(Detection).order_by(Detection.created_at.desc(), Detection.id.desc()).all()
    study_areas = list(dict.fromkeys(sc.study_area_name for sc in scenes if sc.study_area_name))
    if not study_areas:
        study_areas = []

    areas = []
    for index, name in enumerate(study_areas, start=1):
        area_scenes = [scene for scene in scenes if scene.study_area_name == name]
        scene_ids = {scene.id for scene in area_scenes}
        area_detections = [
            detection for detection in detections
            if detection.before_scene_id in scene_ids or detection.after_scene_id in scene_ids
        ]
        latest_scene = area_scenes[0] if area_scenes else None
        incidents = []
        for detection in area_detections[:10]:
            case = s.query(Case).filter_by(change_detection_id=detection.id).first()
            incidents.append({
                "detection_id": detection.id,
                "case_id": case.id if case else None,
                "change_type": detection.change_type,
                "risk_level": detection.risk_level,
                "area_hectares": detection.area_hectares,
                "confidence": detection.confidence,
                "created_at": detection.created_at.isoformat() if detection.created_at else None,
            })
        areas.append({
            "id": index,
            "name": name,
            "district": "Pune",
            "last_checked": latest_scene.scene_date if latest_scene else "—",
            "status": "Change Found" if area_detections else "Ready",
            "alerts": len(area_detections),
            "recent_incidents": incidents,
        })
    return areas


@router.post("/api/admin/monitoring-areas/{area_id}/run")
def run_monitoring_area(area_id: int, u=Depends(need("admin")), s=Depends(db)):
    area = s.get(MonitoringArea, area_id)
    if not area or not area.active:
        raise HTTPException(404, "Active monitoring area not found")
    return run_area_review(s, area)


@router.post("/api/admin/municipalities/{municipality}/import")
async def import_municipality_boundaries(
    municipality: str,
    source: str = Form(...),
    source_year: int = Form(...),
    ward_type: str = Form("administrative"),
    file: UploadFile = File(...),
    u=Depends(need("admin")),
    s=Depends(db),
):
    municipality = municipality.upper()
    if municipality not in {"PMC", "PCMC"}:
        raise HTTPException(422, "municipality must be PMC or PCMC")
    if ward_type not in {"administrative", "electoral", "final"}:
        raise HTTPException(422, "ward_type must be administrative, electoral, or final")
    try:
        payload = json.loads((await file.read()).decode("utf-8"))
        return import_municipality(s, payload, municipality, source.strip(), source_year, ward_type)
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise HTTPException(422, f"Boundary import failed: {exc}") from exc


@router.post("/api/admin/monitoring-grids/import")
async def import_monitoring_grid_collection(
    file: UploadFile = File(...),
    u=Depends(need("admin")),
    s=Depends(db),
):
    """Import an existing 1 km grid FeatureCollection (not ward boundaries)."""
    from shapely.geometry import mapping, shape

    try:
        payload = json.loads((await file.read()).decode("utf-8"))
        features = payload.get("features", []) if payload.get("type") == "FeatureCollection" else []
        grids = [f for f in features if (f.get("properties") or {}).get("feature_type") == "grid"]
        if not grids:
            raise ValueError("No feature_type=grid features found")
        prepared = []
        seen = set()
        for feature in grids:
            p = feature.get("properties") or {}
            municipality, grid_id = p.get("municipality"), p.get("grid_id")
            if municipality not in {"PMC", "PCMC"} or not grid_id or grid_id in seen:
                raise ValueError("Each grid needs a unique grid_id and municipality PMC or PCMC")
            if int(p.get("grid_size_m", 0)) != 1000:
                raise ValueError(f"Grid {grid_id} is not a 1000 m grid")
            geometry = shape(feature["geometry"])
            if geometry.geom_type not in {"Polygon", "MultiPolygon"} or geometry.is_empty or not geometry.is_valid:
                raise ValueError(f"Grid {grid_id} has an invalid polygon geometry")
            seen.add(grid_id)
            prepared.append((p, geometry))
        imported = 0
        for p, geometry in prepared:
            municipality = p["municipality"]
            ward_code = str(p.get("ward_code") or "")
            ward = s.query(MunicipalWard).filter_by(municipality=municipality, ward_code=ward_code, ward_type=p.get("ward_type", "electoral")).first()
            if not ward and ward_code:
                ward = MunicipalWard(municipality=municipality, ward_code=ward_code,
                    ward_name=p.get("ward_name") or f"{municipality} Ward {ward_code}",
                    ward_type=p.get("ward_type") or "electoral", source=p.get("source") or "Imported grid dataset",
                    source_year=p.get("source_year"))
                s.add(ward)
                s.flush()
            grid = s.query(MonitoringGrid).filter_by(grid_id=p["grid_id"]).first()
            if grid is None:
                grid = MonitoringGrid(grid_id=p["grid_id"])
                s.add(grid)
            grid.municipality = municipality
            grid.ward_id = ward.id if ward else None
            grid.ward_code = ward_code
            grid.grid_size_m = 1000
            grid.grid_name = p.get("grid_name") or p["grid_id"]
            grid.geometry_geojson = json.dumps(mapping(geometry), separators=(",", ":"))
            grid.area_sq_km = float(p.get("area_sq_km") or 0)
            grid.status = p.get("status") if p.get("status") in {"Not Started", "Processing", "Completed", "Failed"} else "Not Started"
            grid.active = True
            imported += 1
        s.commit()
        return {"imported": imported, "municipalities": sorted({p["municipality"] for p, _ in prepared})}
    except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        s.rollback()
        raise HTTPException(422, f"Grid import failed: {exc}") from exc


@router.get("/api/admin/municipalities")
def municipalities(u=Depends(need("officer", "admin")), s=Depends(db)):
    rows = s.query(MonitoringGrid.municipality).distinct().all()
    return [{"municipality": row[0], "grid_count": s.query(MonitoringGrid).filter_by(municipality=row[0], active=True).count()} for row in rows]


@router.get("/api/admin/monitoring-grids")
def monitoring_grids(
    municipality: str | None = None,
    ward_code: str | None = None,
    grid_id: str | None = None,
    status: str | None = None,
    include_geometry: bool = False,
    u=Depends(need("officer", "admin")),
    s=Depends(db),
):
    query = s.query(MonitoringGrid).filter(MonitoringGrid.active.is_(True), MonitoringGrid.grid_size_m == 1000)
    if municipality in {"PMC", "PCMC"}:
        query = query.filter_by(municipality=municipality)
    if ward_code:
        query = query.filter_by(ward_code=ward_code)
    if grid_id:
        query = query.filter_by(grid_id=grid_id)
    if status in {"Not Started", "Processing", "Completed", "Failed"}:
        query = query.filter_by(status=status)
    return [{
        "id": grid.id, "grid_id": grid.grid_id, "grid_name": grid.grid_name,
        "municipality": grid.municipality, "ward_id": grid.ward_id, "ward_code": grid.ward_code,
        "grid_size_m": grid.grid_size_m, "area_sq_km": grid.area_sq_km, "status": grid.status,
        **({"geometry": json.loads(grid.geometry_geojson)} if include_geometry else {}),
        "last_job_id": grid.last_job_id,
    } for grid in query.order_by(MonitoringGrid.municipality, MonitoringGrid.ward_code, MonitoringGrid.grid_id).limit(2000)]


@router.get("/api/admin/monitoring-grids/{grid_id}")
def monitoring_grid_detail(grid_id: str, u=Depends(need("officer", "admin")), s=Depends(db)):
    grid = s.query(MonitoringGrid).filter_by(grid_id=grid_id, active=True, grid_size_m=1000).first()
    if not grid:
        raise HTTPException(404, "1 km monitoring grid not found")
    return {
        "id": grid.id, "grid_id": grid.grid_id, "grid_name": grid.grid_name,
        "municipality": grid.municipality, "ward_id": grid.ward_id, "ward_code": grid.ward_code,
        "grid_size_m": grid.grid_size_m, "area_sq_km": grid.area_sq_km, "status": grid.status,
        "geometry": json.loads(grid.geometry_geojson), "last_job_id": grid.last_job_id,
    }


@router.get("/api/admin/municipalities/{municipality}/wards")
def municipality_wards(municipality: str, u=Depends(need("officer", "admin")), s=Depends(db)):
    if municipality.upper() not in {"PMC", "PCMC"}:
        raise HTTPException(422, "municipality must be PMC or PCMC")
    return [{
        "ward_code": ward.ward_code, "ward_name": ward.ward_name, "ward_type": ward.ward_type,
        "area_sq_km": ward.area_sq_km,
    } for ward in s.query(MunicipalWard).filter_by(municipality=municipality.upper()).order_by(MunicipalWard.ward_code)]


@router.post("/api/admin/monitoring-grids/{grid_id}/run", status_code=202)
def start_grid_analysis(grid_id: str, background_tasks: BackgroundTasks, u=Depends(need("officer", "admin")), s=Depends(db)):
    grid = s.query(MonitoringGrid).filter_by(grid_id=grid_id, active=True, grid_size_m=1000).first()
    if not grid:
        raise HTTPException(404, "1 km monitoring grid not found")
    active = s.query(MonitoringJob).filter(MonitoringJob.grid_id == grid.id, MonitoringJob.status.in_(
        ["queued", "searching", "downloading", "detecting"]
    )).first()
    if active:
        return {"job_id": active.id, "status": active.status, "message": "An analysis job is already running for this grid."}
    job = MonitoringJob(grid_id=grid.id, requested_by=u.id, status="queued", message="Queued for independent grid analysis.")
    s.add(job)
    s.flush()
    grid.last_job_id = job.id
    grid.status = "Processing"
    s.commit()
    background_tasks.add_task(run_grid_job, job.id)
    return {"job_id": job.id, "grid_id": grid.grid_id, "status": job.status}


@router.get("/api/admin/monitoring-jobs/{job_id}")
def monitoring_job(job_id: int, u=Depends(need("officer", "admin")), s=Depends(db)):
    job = s.get(MonitoringJob, job_id)
    if not job:
        raise HTTPException(404, "Monitoring job not found")
    return {
        "id": job.id, "grid_id": s.get(MonitoringGrid, job.grid_id).grid_id,
        "status": job.status, "message": job.message, "before_scene_id": job.before_scene_id,
        "after_scene_id": job.after_scene_id, "created_at": job.created_at, "started_at": job.started_at,
        "completed_at": job.completed_at,
    }


@router.get("/api/admin/users")
def users(u=Depends(need("admin")), s=Depends(db)):
    return [{"id": item.id, "name": item.name, "email": item.email, "role": item.role} for item in s.query(User)]


@router.post("/api/admin/assign-case")
def assign(case_id: int, officer_id: int, u=Depends(need("admin")), s=Depends(db)):
    case = s.get(Case, case_id)
    officer = s.get(User, officer_id)
    if not case or not officer or officer.role != "officer":
        raise HTTPException(404, "Case or officer not found")
    case.assigned_officer_id = officer.id
    s.commit()
    return {"ok": True}


@router.post("/api/admin/portals")
def add_portal(r: PortalIn, category: str, u=Depends(need("admin")), s=Depends(db)):
    portal = Portal(category=category, last_verified_date=datetime.utcnow().date().isoformat(), **r.model_dump())
    s.add(portal)
    s.commit()
    return {"id": portal.id}


@router.put("/api/admin/portals/{i}")
def edit_portal(i: int, r: PortalIn, u=Depends(need("admin")), s=Depends(db)):
    portal = s.get(Portal, i)
    if not portal:
        raise HTTPException(404)
    for key, value in r.model_dump().items():
        setattr(portal, key, value)
    portal.last_verified_date = datetime.utcnow().date().isoformat()
    s.commit()
    return {"ok": True}


@router.get("/api/admin/cases/{case_id}/evidence")
def list_case_evidence(case_id: int, u=Depends(need("admin", "officer")), s=Depends(db)):
    if not s.get(Case, case_id):
        raise HTTPException(404, "Case not found")
    items = s.query(Evidence).filter_by(case_id=case_id).order_by(Evidence.created_at.desc()).all()
    return [_evidence_out(item, s) for item in items]


@router.post("/api/admin/cases/{case_id}/evidence")
async def upload_case_evidence(
    case_id: int,
    evidence_type: str = Form(...),
    file: UploadFile = File(...),
    captured_at: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    scene_id: Optional[int] = Form(None),
    u=Depends(need("admin")),
    s=Depends(db),
):
    case = s.get(Case, case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    if scene_id is not None and not s.get(Scene, scene_id):
        raise HTTPException(404, "Associated satellite scene not found")
    if (latitude is None) != (longitude is None):
        raise HTTPException(422, "Provide both latitude and longitude or neither")
    if latitude is not None and not -90 <= latitude <= 90:
        raise HTTPException(422, "Latitude must be between -90 and 90")
    if longitude is not None and not -180 <= longitude <= 180:
        raise HTTPException(422, "Longitude must be between -180 and 180")
    if captured_at:
        try:
            datetime.fromisoformat(captured_at)
        except ValueError as exc:
            raise HTTPException(422, "Capture date must be a valid ISO date or date-time") from exc
    allowed_types = {"Field photo", "Drone image", "Inspection document", "Geotagged image", "Other"}
    if evidence_type not in allowed_types:
        raise HTTPException(422, "Choose a supported evidence type")

    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in EVIDENCE_FORMATS:
        raise HTTPException(415, "Evidence must be a JPG, PNG, WebP, TIFF, or PDF file")
    contents = await file.read(MAX_EVIDENCE_BYTES + 1)
    if len(contents) > MAX_EVIDENCE_BYTES:
        raise HTTPException(413, "Evidence files must be smaller than 25 MB")
    media_type, signature = EVIDENCE_FORMATS[extension]
    if extension in {".tif", ".tiff"}:
        valid_signature = contents.startswith((b"II*\x00", b"MM\x00*"))
    else:
        valid_signature = contents.startswith(signature)
        if extension == ".webp":
            valid_signature = valid_signature and contents[8:12] == b"WEBP"
    if not valid_signature:
        raise HTTPException(415, "The file contents do not match the selected image or PDF format")

    directory = os.path.join(BASE, "data", "uploads", "case_evidence")
    os.makedirs(directory, exist_ok=True)
    storage_path = os.path.join(directory, f"case_{case_id}_{uuid.uuid4().hex}{extension}")
    with open(storage_path, "wb") as destination:
        destination.write(contents)

    evidence = Evidence(
        case_id=case_id,
        scene_id=scene_id,
        original_filename=os.path.basename(file.filename or "evidence"),
        storage_path=storage_path,
        media_type=media_type,
        evidence_type=evidence_type,
        captured_at=captured_at,
        latitude=latitude,
        longitude=longitude,
        uploaded_by=u.id,
    )
    s.add(evidence)
    s.commit()
    return _evidence_out(evidence, s)


@router.get("/api/admin/evidence/{evidence_id}/download")
def download_evidence(evidence_id: int, u=Depends(need("admin", "officer")), s=Depends(db)):
    item = s.get(Evidence, evidence_id)
    if not item or not os.path.isfile(item.storage_path):
        raise HTTPException(404, "Evidence file not found")
    return FileResponse(item.storage_path, media_type=item.media_type, filename=item.original_filename)
