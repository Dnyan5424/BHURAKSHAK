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
@router.post("/api/auth/register")
def register(r:Reg,s=Depends(db)):
    if s.query(User).filter_by(email=r.email).first():raise HTTPException(400,"Email already registered")
    u=User(name=r.name,mobile=r.mobile,email=r.email,password_hash=hp(r.password),role="citizen");s.add(u);s.commit();return {"token":make_token(u.id,u.role)}
@router.post("/api/auth/login")
def login(r:Login,s=Depends(db)):
    u=s.query(User).filter_by(email=r.email).first()
    if not u or u.password_hash!=hp(r.password):raise HTTPException(401,"Invalid credentials")
    return {"token":make_token(u.id,u.role),"role":u.role,"name":u.name}
@router.get("/api/auth/me")
def me(u=Depends(user)):return {"id":u.id,"name":u.name,"email":u.email,"role":u.role}
