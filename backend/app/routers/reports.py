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
@router.get("/api/reports/{i}/pdf")
def pdf(i:int,u=Depends(need("officer","admin")),s=Depends(db)):
    p=os.path.join(BASE,"data/reports",f"case_{i}.pdf");sv.make_pdf(p,rows_for(i,s));return FileResponse(p,media_type="application/pdf",filename=f"case_{i}.pdf")
@router.get("/api/reports/{i}/csv")
def csvr(i:int,u=Depends(need("officer","admin")),s=Depends(db)):
    o=io.StringIO();csv.writer(o).writerows(rows_for(i,s));return Response(o.getvalue(),media_type="text/csv")
