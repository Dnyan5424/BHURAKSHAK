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
    return {"petition_id":p.petition_code,"status":p.status,"updated":p.updated_at,"department":"Concerned department (assigned on review)",
            "response":"Evidence under review. Official verification is required.","next_step":"Wait for the field verification update, or use the official portal.",
            "portal_category":CAT2PORTAL.get(p.category,"general")}
@router.post("/api/petitions/{code}/documents")
async def pet_doc(code:str,mobile:str,f:UploadFile=File(...),s=Depends(db)):
    p=s.query(Petition).filter_by(petition_code=code,mobile=mobile).first()
    if not p:raise HTTPException(404)
    path=os.path.join(BASE,"data/uploads",f"{code}_{os.path.basename(f.filename)}");open(path,"wb").write(await f.read());p.photo_url=path;s.commit();return {"ok":True}
@router.get("/api/notifications")
def notifications(u=Depends(user),s=Depends(db)):
    return [{"message":n.message,"created_at":n.created_at} for n in s.query(Notification).filter_by(mobile=u.mobile).order_by(Notification.id.desc())]
