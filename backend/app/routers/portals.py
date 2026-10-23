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
@router.get("/api/portals")
def portals(category:Optional[str]=None,s=Depends(db)):
    q=s.query(Portal);q=q.filter_by(category=category) if category else q
    n="You are being directed to an official government portal. BhuRakshak does not submit complaints on your behalf unless an authorized integration is available."
    return [{c.name:getattr(x,c.name) for c in Portal.__table__.columns}|{"notice":n} for x in q]
