import os,csv,io,json
from datetime import datetime
from typing import Optional
import numpy as np
from fastapi import APIRouter,Depends,HTTPException,UploadFile,File,Form
from fastapi.responses import FileResponse,Response
from ..models import *
from ..schemas import *
from ..security import db,hp,make_token,user,need
from ..config import DISCLAIMER
from ..utils.helpers import *
from .. import services as sv
router=APIRouter()
@router.post("/api/petitions")
def petition(p:Pet,s=Depends(db)):
    if not p.consent_given:raise HTTPException(400,"Consent is required")
    code=f"PET-{datetime.utcnow().year}-{s.query(Petition).count()+1:05d}"
    near=next((d.id for d in s.query(Detection).all() if sv.hav([p.longitude,p.latitude],sv.centroid(json.loads(d.polygon_geojson)))<=500),None)
    pe=Petition(petition_code=code,detection_id=near,status="Under AI Review" if near else "Submitted",**p.model_dump());s.add(pe);s.flush()
    c=s.query(Case).filter_by(change_detection_id=near).first() if near else None
    if c and not c.petition_id:c.petition_id=pe.id
    s.add(Notification(mobile=p.mobile,message=f"Petition {code} received. Status: {pe.status}."))
    s.commit();return {"petition_code":code,"status":pe.status,"linked_to_detected_change":bool(near)}
@router.get("/api/petitions/track/{code}")
def track(code:str,mobile:str,s=Depends(db)):
    p=s.query(Petition).filter_by(petition_code=code,mobile=mobile).first()
    if not p:raise HTTPException(404,"No petition found for this ID and mobile number")
    c=s.query(Case).filter_by(petition_id=p.id).first()
    if not c and p.detection_id:c=s.query(Case).filter_by(change_detection_id=p.detection_id).first()
    resp = (c.officer_remarks if c and c.officer_remarks else "Evidence under review. Official verification is required.")
    dec = (c.officer_decision if c and c.officer_decision else None)
    case_id = (c.id if c else None)
    return {
        "petition_id":p.petition_code,
        "status":p.status,
        "updated":p.updated_at,
        "created_at":p.created_at,
        "category":p.category,
        "description":p.description,
        "village_city":p.village_city,
        "district":p.district,
        "photo_url":f"/api/petitions/{p.petition_code}/photo" if p.photo_url and os.path.exists(p.photo_url) else None,
        "department":"Concerned Department",
        "response":resp,
        "officer_decision":dec,
        "case_id":case_id,
        "next_step":"Decision recorded by officer." if dec else "Wait for field verification update, or use the official portal.",
        "portal_category":CAT2PORTAL.get(p.category,"general")
    }
@router.get("/api/petitions/{code}/photo")
def pet_photo(code:str,s=Depends(db)):
    p=s.query(Petition).filter_by(petition_code=code).first()
    if not p or not p.photo_url or not os.path.exists(p.photo_url):raise HTTPException(404,"Photo not found")
    return FileResponse(p.photo_url)
@router.post("/api/petitions/{code}/documents")
async def pet_doc(code:str,mobile:str,f:UploadFile=File(...),s=Depends(db)):
    p=s.query(Petition).filter_by(petition_code=code,mobile=mobile).first()
    if not p:raise HTTPException(404)
    upload_dir = os.path.join(BASE,"data","uploads")
    os.makedirs(upload_dir, exist_ok=True)
    path=os.path.join(upload_dir,f"{code}_{os.path.basename(f.filename or 'photo.jpg')}");open(path,"wb").write(await f.read());p.photo_url=path;s.commit();return {"ok":True}
@router.get("/api/notifications")
def notifications(mobile:Optional[str]=None,s=Depends(db)):
    q = s.query(Notification)
    if mobile:q = q.filter_by(mobile=mobile.strip())
    items = q.order_by(Notification.id.desc()).limit(30).all()
    return [{"id":n.id,"mobile":n.mobile,"message":n.message,"created_at":n.created_at} for n in items]
