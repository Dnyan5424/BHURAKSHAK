import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..models import Case, Detection, Evidence, Petition, Portal, Scene, User
from ..schemas import PortalIn
from ..security import db, need
from ..utils.helpers import BASE

router = APIRouter()
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
    return {
        "petitions": s.query(Petition).count(),
        "detections": len(detections),
        "open_cases": s.query(Case).filter(Case.status.notin_(["Closed", "False Positive"])).count(),
        "total_hectares": round(sum(item.area_hectares for item in detections), 1),
        "by_risk": {level: sum(item.risk_level == level for item in detections) for level in ("Low", "Moderate", "High", "Critical")},
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
