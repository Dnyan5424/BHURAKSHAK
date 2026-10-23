"""Rule-based change detection on aligned before/after bands. Thresholds live in config.TH."""
import json,os,numpy as np
from scipy import ndimage
from shapely import contains_xy
from shapely.geometry import box,mapping,shape
from ..config import TH,MIN_PIXELS
from ..models import Detection,Gis,Case
from .satellite_service import align,cloud_fraction,save_processed,PROC
from .gis_service import gis_context
from .risk_service import score,explain
def nd(a,b):return (a-b)/(a+b+1e-9)
def indices(x):
    return dict(ndvi=nd(x["nir"],x["red"]),ndwi=nd(x["green"],x["nir"]),ndbi=nd(x["swir"],x["nir"]),bsi=nd(x["swir"]+x["red"],x["nir"]+x["blue"]))
def change_maps(b,a):
    ib,ia=indices(b),indices(a);return {k:ia[k]-ib[k] for k in ib}
def save_geotiff(path,d,origin,px=9e-5):
    """Write dNDVI/dNDWI/dNDBI/dBSI as a 4-band GeoTIFF. Skipped quietly if rasterio is not installed."""
    try:
        import rasterio
        from rasterio.transform import from_origin
    except ImportError:return None
    arr=np.stack([d[k] for k in("ndvi","ndwi","ndbi","bsi")]).astype("float32")
    with rasterio.open(path,"w",driver="GTiff",height=arr.shape[1],width=arr.shape[2],count=4,dtype="float32",crs="EPSG:4326",transform=from_origin(origin[0],origin[1],px,px)) as f:f.write(arr)
    return path
def detect(b,a,origin,px=9e-5,d=None,boundary=None):
    d=d or change_maps(b,a)
    inside=None
    if boundary is not None:
        area=shape(boundary)
        if area.geom_type not in ("Polygon","MultiPolygon") or area.is_empty or not area.is_valid:
            raise ValueError("Analysis boundary must be a valid Polygon or MultiPolygon")
        rows,cols=np.indices(d["ndvi"].shape)
        inside=contains_xy(area,origin[0]+(cols+.5)*px,origin[1]-(rows+.5)*px)
    masks={"Possible vegetation loss":d["ndvi"]<TH["ndvi_loss"],
      "Possible bare soil / excavation":(d["bsi"]>TH["bsi_up"])&(d["ndvi"]<TH["bsi_ndvi"]),
      "Possible built-up expansion":d["ndbi"]>TH["ndbi_up"],
      "Possible water-body change":abs(d["ndwi"])>TH["ndwi"]}
    taken=np.zeros(d["ndvi"].shape,bool);out=[]
    for t,m in masks.items():
        if inside is not None:m=m&inside
        lab,n=ndimage.label(m&~taken)
        for i in range(1,n+1):
            c=lab==i;k=int(c.sum())
            if k<MIN_PIXELS:continue
            taken|=c;ys,xs=np.where(c)
            poly=box(origin[0]+xs.min()*px,origin[1]-(ys.max()+1)*px,origin[0]+(xs.max()+1)*px,origin[1]-ys.min()*px)
            m_={x:float(d[x][c].mean()) for x in d}
            out.append(dict(change_type=t,area_hectares=round(k*0.01,2),polygon=mapping(poly),diffs=m_,magnitude=min(1,max(abs(v) for v in m_.values())/0.6)))
    return out
def run_detection(s,b,a,origin,layers,bid,aid,boundary=None):
    b,a=align(b,a);cloud=max(cloud_fraction(b),cloud_fraction(a));d=change_maps(b,a)
    save_processed(b,f"before_{bid}");save_processed(a,f"after_{aid}")
    os.makedirs(PROC,exist_ok=True);save_geotiff(os.path.join(PROC,f"change_{bid}_{aid}.tif"),d,origin)
    res=[]
    for x in detect(b,a,origin,d=d,boundary=boundary):
        g=gis_context(x["polygon"],layers);conf,pr,lvl=score(x,g,quality=1-cloud,cloud=1-cloud)
        row=Detection(before_scene_id=bid,after_scene_id=aid,change_type=x["change_type"],area_hectares=x["area_hectares"],confidence=conf,risk_score=pr,risk_level=lvl,
            polygon_geojson=json.dumps(x["polygon"]),ndvi_difference=x["diffs"]["ndvi"],ndwi_difference=x["diffs"]["ndwi"],ndbi_difference=x["diffs"]["ndbi"],bsi_difference=x["diffs"]["bsi"],
            status="Needs verification",evidence=explain(x,g,lvl));s.add(row);s.flush()
        s.add(Gis(change_detection_id=row.id,**g));s.add(Case(change_detection_id=row.id,status="Needs verification"));res.append(row)
    s.commit();return res
