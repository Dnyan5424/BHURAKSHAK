from typing import Optional
from pydantic import BaseModel, Field
class Reg(BaseModel):name:str;mobile:str;email:str;password:str
class Login(BaseModel):email:str;password:str
class Pet(BaseModel):
    latitude:float;longitude:float;village_city:str;district:str;category:str;description:str;mobile:str
    is_anonymous:bool=False;consent_given:bool=False
class Decision(BaseModel):decision:str;remarks:str="";permit_reference:str="";recommended_action:str=""
class RunReq(BaseModel):
    before_scene_id:int
    after_scene_id:int
    origin_lon:float=Field(ge=-180,le=180)
    origin_lat:float=Field(ge=-90,le=90)
    max_cloud_cover_percent:float=Field(default=100,ge=0,le=100)
    boundary:Optional[dict]=None
class PortalIn(BaseModel):department_name:str;portal_name:str;portal_url:str;required_documents:str=""
class AutomaticFetchIn(BaseModel):
    frequency_minutes:int=Field(default=60,ge=15,le=10080)
    enabled:bool=True
class AcquisitionLimitIn(BaseModel):
    manual_jobs_limit:int=Field(default=5,ge=0,le=1000)
class SatelliteSearchIn(BaseModel):
    start_date:str
    end_date:str
    max_cloud_cover:float=Field(default=30,ge=0,le=100)
    limit:int=Field(default=20,ge=1,le=100)
    geometry:Optional[dict]=None
class SatelliteDownloadIn(BaseModel):
    image_type:str="after"
    mode:str="manual"
class SatelliteProcessIn(BaseModel):
    before_scene_id:int
    after_scene_id:int
    max_cloud_cover_percent:float=Field(default=100,ge=0,le=100)
class GridImportIn(BaseModel):
    municipality:str
    source:str
    source_year:int
    boundary_type:str="administrative"
    ward_type:str="administrative"
