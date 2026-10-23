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
    if r.decision=="Legal / Permitted Change" and not (r.remarks and r.permit_reference):raise HTTPException(400,"Reason and permit/record reference required")
    if r.decision=="Potential Violation" and not (r.remarks and r.recommended_action):raise HTTPException(400,"Reason and recommended department action required")
    c.officer_decision,c.officer_remarks,c.permit_reference,c.decision_date,c.status=r.decision,r.remarks,r.permit_reference,datetime.utcnow(),r.decision
    s.get(Detection,c.change_detection_id).status=r.decision
    if c.petition_id:
        pe=s.get(Petition,c.petition_id);pe.status=DECISIONS[r.decision];s.add(Notification(mobile=pe.mobile,message=f"Update on {pe.petition_code}: {pe.status}."))
    s.commit();return case_out(c,s)
@router.post("/api/officer/cases/{i}/field-report")
async def field(i:int,f:UploadFile=File(...),u=Depends(need("officer","admin")),s=Depends(db)):
    c=s.get(Case,i);p=os.path.join(BASE,"data/uploads",f"case{i}_{os.path.basename(f.filename)}")
    open(p,"wb").write(await f.read());c.field_photo_url=p;s.commit();return {"ok":True}
@router.patch("/api/officer/cases/{i}/close")
def close(i:int,u=Depends(need("officer","admin")),s=Depends(db)):return decide(i,Decision(decision="Closed"),u,s)
