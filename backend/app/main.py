from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from .database import B,E
from .models import *
from .utils.helpers import BASE
from .routers import auth,petitions,detections,officer,portals,reports,admin
B.metadata.create_all(E)
app=FastAPI(title="BhuRakshak API",description="AI-assisted land-use change detection. Not a legal determination.")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])
for r in (auth,petitions,detections,officer,portals,reports,admin):app.include_router(r.router)
app.mount("/",StaticFiles(directory=os.path.join(BASE,"static"),html=True))
