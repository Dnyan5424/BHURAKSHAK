"""Synthetic demo data (simulated, no real personal data). Run from backend/: python -m seed.seed"""
import os,json,numpy as np
from app.database import B,E,S
from app.models import *
from app.security import hp
from app import services as sv
from app.utils.helpers import BASE
B.metadata.drop_all(E);B.metadata.create_all(E);s=S()
for n,e,p,r in[("Demo Citizen","citizen@demo.com","Citizen@123","citizen"),("Demo Officer","officer@demo.com","Officer@123","officer"),("Demo Admin","admin@demo.com","Admin@123","admin")]:
    s.add(User(name=n,email=e,mobile="9000000000",password_hash=hp(p),role=r))
P=[("forest_loss","Forest Department","PARIVESH","https://parivesh.nic.in","Location, photos"),("mining","District Mining Officer","State mining department","https://mahamining.gov.in","Location, photos"),
("construction","Municipal Corporation / Town Planning","Local body grievance","https://www.mahaonline.gov.in","Address, photos"),("water_encroachment","Revenue / Irrigation Dept","Local revenue office","https://aaplesarkar.mahaonline.gov.in","Location, survey no."),
("environmental_clearance","MoEFCC / SPCB","PARIVESH","https://parivesh.nic.in","Project details"),("general","CPGRAMS","CPGRAMS","https://pgportal.gov.in","Complaint details")]
for c,d,n,u,r in P:s.add(Portal(category=c,department_name=d,portal_name=n,portal_url=u,required_documents=r,last_verified_date="Verify before use"))
rng=np.random.default_rng(1);N=36
def base():return {k:np.full((N,N),v,"float32")+rng.normal(0,.005,(N,N)).astype("float32") for k,v in dict(blue=.06,green=.10,red=.08,nir=.5,swir=.2).items()}
bef,aft=base(),base()
def patch(r0,c0,h,w,**v):
    for k,x in v.items():aft[k][r0:r0+h,c0:c0+w]=x
patch(8,8,8,10,nir=.25,red=.15,swir=.22)
for t,x in(("before",bef),("after",aft)):np.savez(f"{BASE}/data/raw/demo_{t}.npz",**x)
area_geometry={"type":"Polygon","coordinates":[[[73.85,18.55],[73.85324,18.55],[73.85324,18.54676],[73.85,18.54676],[73.85,18.55]]]}
for t,dt in(("before","2024-01-15"),("after","2025-01-20")):
    s.add(Scene(study_area_name="DEMO Small Area",image_type=t,scene_date=dt,source="SIMULATED (Sentinel-2-like)",sensor="Synthetic",cloud_cover_percent=2,spatial_resolution="10 m",image_url=f"{BASE}/data/raw/demo_{t}.npz",provider_metadata=json.dumps({"geometry":area_geometry,"analysis_origin":[73.85,18.55]})))
s.add(MonitoringArea(name="DEMO Small Area",district="Pune",area_type="demo",geometry_geojson=json.dumps(area_geometry),area_sq_km=.1,source="Repository demo boundary",boundary_version="demo-1",max_cloud_cover=30))
s.commit();o=(73.85,18.55);px=9e-5
def at(r,c,dx=0,dy=0):return [o[0]+c*px+dx,o[1]-r*px+dy]
far=[o[0]+.05,o[1]+.05]
L={"water":[at(17,20,.001),far],"road":[at(12,12,0,.0008),far],"forest":[at(12,12,.0015),far],"protected":[at(12,12,.0015),far]}
json.dump({**L,"origin":list(o)},open(f"{BASE}/data/raw/demo_layers.json","w"))
sv.run_detection(s,bef,aft,o,L,1,2)
SPEC={"Possible vegetation loss":(86,"High",38+24,"Needs verification","Needs verification","Submitted","Tree cutting or vegetation loss","Trees appear removed near the lake edge (SIMULATED)."),
"Possible built-up expansion":(74,"Moderate",38,"Under field verification","Under field verification","Under Field Verification","Illegal construction suspicion","New structures near the road (SIMULATED)."),
"Possible bare soil / excavation":(91,"Critical",84,"Potential violation — action initiated","Potential Violation","Potential Violation","Quarrying or excavation suspicion","Digging near forest boundary (SIMULATED).")}
for i,d in enumerate(s.query(Detection).all()):
    c,l,rs,ds,cs,ps,cat,desc=SPEC[d.change_type];d.confidence=c;d.risk_level=l;d.risk_score=rs;d.status=ds
    cs_=s.query(Case).filter_by(change_detection_id=d.id).first();cs_.status=cs
    if cs=="Potential Violation":cs_.officer_decision=cs;cs_.officer_remarks="Field team confirmed fresh excavation; no permit found (SIMULATED).";cs_.assigned_officer_id=2
    g=sv.centroid(json.loads(d.polygon_geojson))
    p=Petition(petition_code=f"PET-2025-{i+1:05d}",mobile=f"900000000{i+1}",latitude=g[1],longitude=g[0],village_city="Demo Village (synthetic)",district="Demo District",category=cat,description=desc,status=ps,consent_given=True,detection_id=d.id)
    s.add(p);s.flush();cs_.petition_id=p.id
s.add(Notification(mobile="9000000000",message="Demo (synthetic): welcome. Track reports with Petition ID + mobile."));s.commit();print("Seeded. Track with PET-2025-00001 / 9000000001")
