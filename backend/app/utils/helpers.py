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
from .. import services as sv
BASE=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DECISIONS={"Legal / Permitted Change":"Legal / Permitted Change","Potential Violation":"Potential Violation","False Positive":"False Positive","Needs More Evidence":"Under Field Verification","Closed":"Closed"}
CAT2PORTAL={"Tree cutting or vegetation loss":"forest_loss","Quarrying or excavation suspicion":"mining","Illegal construction suspicion":"construction","River, lake, or water-body encroachment":"water_encroachment"}
def D(d,g=None):
    o={"id":d.id,"change_type":d.change_type,"area_hectares":d.area_hectares,"confidence":d.confidence,"risk_score":d.risk_score,"risk_level":d.risk_level,
       "polygon":json.loads(d.polygon_geojson),"status":d.status,"ndvi_difference":d.ndvi_difference,"ndwi_difference":d.ndwi_difference,
       "ndbi_difference":d.ndbi_difference,"bsi_difference":d.bsi_difference,"why_flagged":d.evidence,"disclaimer":DISCLAIMER}
    if g:o["gis"]={k:getattr(g,k) for k in("distance_to_water_m","distance_to_road_m","distance_to_forest_m","near_protected_area","existing_lulc_class","explanation")}
    return o
def case_out(c,s):
    d=s.get(Detection,c.change_detection_id);o=D(d,s.query(Gis).filter_by(change_detection_id=d.id).first())
    pe=s.get(Petition,c.petition_id) if c.petition_id else None
    return o|{"case_id":c.id,"case_status":c.status,"decision":c.officer_decision,"remarks":c.officer_remarks,"permit_reference":c.permit_reference,
              "petition":{"code":pe.petition_code,"category":pe.category,"description":pe.description} if pe else None}
def rows_for(i,s):
    c=s.get(Case,i)
    if not c:raise HTTPException(404)
    o=case_out(c,s);g=o["gis"];pe=o["petition"] or {}
    return [("Case ID",c.id),("Petition ID",pe.get("code","-")),("Centroid (lon,lat)",[round(v,5) for v in sv.centroid(o["polygon"])]),("Imagery (before -> after)",scene_info(s,c)),("Change type",o["change_type"]),
     ("Area (ha)",o["area_hectares"]),("Confidence %",o["confidence"]),("Risk",f'{o["risk_level"]} ({o["risk_score"]})'),
     ("dNDVI / dNDWI",f'{o["ndvi_difference"]:.2f} / {o["ndwi_difference"]:.2f}'),("dNDBI / dBSI",f'{o["ndbi_difference"]:.2f} / {o["bsi_difference"]:.2f}'),
     ("GIS context",g["explanation"]),("Citizen complaint",pe.get("description","-")),("Officer decision",c.officer_decision or "Pending"),
     ("Remarks",c.officer_remarks or "-"),("Final status",c.status),("Why flagged",o["why_flagged"])]
def scene_info(s,c):
    d=s.get(Detection,c.change_detection_id);b,a=s.get(Scene,d.before_scene_id),s.get(Scene,d.after_scene_id)
    return f"{b.scene_date} -> {a.scene_date}; {a.source}; {a.sensor}" if b and a else "-"
