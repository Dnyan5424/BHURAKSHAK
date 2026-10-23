"""Run after seeding: python -m seed.seed && pytest"""
import numpy as np
from fastapi.testclient import TestClient
from app.services.change_detection_service import detect
from app.main import app
c=TestClient(app)
def tok(e,p):return {"Authorization":"Bearer "+c.post("/api/auth/login",json={"email":e,"password":p}).json()["token"]}
def test_public_detections():assert len(c.get("/api/change-detections").json())>=3
def test_detection_detail_includes_satellite_metadata():
    observations=c.get("/api/change-detections/1").json()["satellite_observations"]
    assert observations["before"]["scene_date"]=="2024-01-15"
    assert observations["after"]["scene_date"]=="2025-01-20"
    assert observations["after"]["cloud_cover_percent"]==2
def test_track_needs_matching_mobile():
    assert c.get("/api/petitions/track/PET-2025-00001?mobile=9000000001").status_code==200
    assert c.get("/api/petitions/track/PET-2025-00001?mobile=1").status_code==404
def test_roles():
    assert c.get("/api/officer/cases").status_code==401
    assert c.get("/api/officer/cases",headers=tok("citizen@demo.com","Citizen@123")).status_code==403
def test_decision_rules():
    h=tok("officer@demo.com","Officer@123")
    assert c.patch("/api/officer/cases/1/decision",json={"decision":"Legal / Permitted Change","remarks":"ok"},headers=h).status_code==400
    assert c.patch("/api/officer/cases/1/decision",json={"decision":"Needs More Evidence","remarks":"revisit"},headers=h).status_code==200
def test_notifications_and_report():
    assert len(c.get("/api/notifications",headers=tok("citizen@demo.com","Citizen@123")).json())>=1
    assert c.get("/api/reports/1/pdf",headers=tok("officer@demo.com","Officer@123")).status_code==200
def test_scene_catalog_includes_quality_metadata_and_rejects_unsupported_upload():
    scenes=c.get("/api/scenes").json()
    assert scenes and {"sensor","cloud_cover_percent","spatial_resolution","scene_date","source"}<=scenes[0].keys()
    admin=tok("admin@demo.com","Admin@123")
    r=c.post("/api/scenes/upload",headers=admin,data={"study_area_name":"Test","image_type":"before","scene_date":"2025-01-01"},
             files={"file":("scene.txt",b"not a raster","text/plain")})
    assert r.status_code==415
def test_case_evidence_access_and_format_validation():
    officer=tok("officer@demo.com","Officer@123")
    cases=c.get("/api/officer/cases",headers=officer).json()
    case_id=cases[0]["case_id"]
    path=f"/api/admin/cases/{case_id}/evidence"
    assert c.get(path).status_code==401
    assert c.get(path,headers=tok("citizen@demo.com","Citizen@123")).status_code==403
    assert c.get(path,headers=officer).status_code==200
    r=c.post(path,headers=tok("admin@demo.com","Admin@123"),data={"evidence_type":"Field photo"},
             files={"file":("photo.jpg",b"not a JPEG","image/jpeg")})
    assert r.status_code==415
def test_polygon_aoi_masks_change_pixels():
    shape=(20,20)
    changes={"ndvi":np.full(shape,-.4),"ndwi":np.zeros(shape),"ndbi":np.zeros(shape),"bsi":np.zeros(shape)}
    boundary={"type":"Polygon","coordinates":[[[0,1],[.05,1],[.05,.95],[0,.95],[0,1]]]}
    result=detect(None,None,(0,1),px=.01,d=changes,boundary=boundary)
    assert len(result)==1
    assert result[0]["area_hectares"]==.25
