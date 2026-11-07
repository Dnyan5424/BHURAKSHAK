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
@router.get("/api/officer/alerts")
def alerts(u=Depends(need("officer","admin")),s=Depends(db)):
    return [{"id":n.id,"message":n.message,"created_at":n.created_at} for n in s.query(Notification).filter_by(mobile=u.mobile).order_by(Notification.id.desc()).limit(30).all()]
@router.get("/api/officer/cases")
def cases(u=Depends(need("officer","admin")),s=Depends(db)):
    return sorted([case_out(c,s) for c in s.query(Case).all()],key=lambda x:-x["risk_score"])
@router.get("/api/officer/cases/{i}")
def case(i:int,u=Depends(need("officer","admin")),s=Depends(db)):
    c=s.get(Case,i)
    if not c:raise HTTPException(404)
    return case_out(c,s)
@router.patch("/api/officer/cases/{i}/decision")
def decide(i:int,r:Decision,u=Depends(need("officer","admin")),s=Depends(db)):
    c=s.get(Case,i)
    if not c:raise HTTPException(404)
    if r.decision not in DECISIONS:raise HTTPException(400,"Unknown decision")
    if not r.remarks or not r.remarks.strip():raise HTTPException(400,"Remarks / reason is required for recording a decision")
    if r.decision == "Legal / Permitted Change" and not r.permit_reference:raise HTTPException(400,"Reason and permit/record reference required")
    canonical_status = DECISIONS[r.decision]
    c.officer_decision,c.officer_remarks,c.permit_reference,c.decision_date,c.status=r.decision,r.remarks.strip(),r.permit_reference or "",datetime.utcnow(),canonical_status
    det = s.get(Detection,c.change_detection_id)
    if det:det.status=canonical_status
    if c.petition_id:
        pe=s.get(Petition,c.petition_id)
        if pe:
            pe.status=canonical_status
            s.add(Notification(mobile=pe.mobile,message=f"Update on {pe.petition_code}: Decision recorded as '{r.decision}'. Remark: {r.remarks.strip()}"))
    s.commit();return case_out(c,s)
@router.post("/api/officer/cases/{i}/field-report")
async def field(i:int,f:UploadFile=File(...),u=Depends(need("officer","admin")),s=Depends(db)):
    c=s.get(Case,i)
    if not c:raise HTTPException(404)
    upload_dir = os.path.join(BASE,"data","uploads")
    os.makedirs(upload_dir, exist_ok=True)
    p=os.path.join(upload_dir,f"case{i}_{os.path.basename(f.filename or 'field.jpg')}")
    open(p,"wb").write(await f.read())
    c.field_photo_url=p;s.commit()
    return {"ok":True,"photo_url":f"/api/officer/cases/{i}/field-photo"}
@router.get("/api/officer/cases/{i}/field-photo")
def get_field_photo(i:int,s=Depends(db)):
    c=s.get(Case,i)
    if not c or not c.field_photo_url or not os.path.exists(c.field_photo_url):raise HTTPException(404,"Field photo not found")
    return FileResponse(c.field_photo_url)
@router.patch("/api/officer/cases/{i}/close")
def close(i:int,u=Depends(need("officer","admin")),s=Depends(db)):return decide(i,Decision(decision="Closed",remarks="Case closed by officer review."),u,s)
