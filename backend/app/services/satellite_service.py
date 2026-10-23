"""Satellite preprocessing: read, clip, normalise, cloud-check, co-register, save, preview."""
import io,os,numpy as np
from scipy import ndimage
PROC=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),"data","processed")
BANDS=("blue","green","red","nir","swir")
def load(path,boundary=None):
    """Returns (bands dict, warning). .npz with 5 bands, or GeoTIFF (bands 1-5 = B,G,R,NIR,SWIR; fewer = RGB fallback).
    boundary: optional GeoJSON geometry to clip a GeoTIFF to the study area."""
    if path.endswith(".npz"):
        with np.load(path,allow_pickle=False) as z:
            missing=set(BANDS)-set(z.files)
            if missing:raise ValueError(f"NPZ scene is missing required bands: {', '.join(sorted(missing))}")
            bands={k:z[k].astype("float32") for k in BANDS}
        if len({v.shape for v in bands.values()})!=1 or bands["red"].ndim!=2:
            raise ValueError("NPZ spectral bands must be same-size two-dimensional arrays")
        if any(not np.isfinite(v).all() for v in bands.values()):
            raise ValueError("NPZ spectral bands must contain finite numeric values")
        return normalize(bands),None
    import rasterio
    with rasterio.open(path) as r:
        if boundary:
            from rasterio.mask import mask
            a,_=mask(r,[boundary],crop=True)
        else:a=r.read()
    a=normalize_array(a.astype("float32"))
    if len(a)>=5:return dict(blue=a[0],green=a[1],red=a[2],nir=a[3],swir=a[4]),None
    return dict(red=a[0],green=a[1],blue=a[2],nir=a[1],swir=a[0]),"RGB image: spectral-index accuracy is limited."
def normalize_array(a):
    return np.clip(a/10000.0 if a.max()>1.5 else a,0,1)
def normalize(b):return {k:normalize_array(v) for k,v in b.items()}
def cloud_fraction(b):
    """Crude cloud mask: bright in blue, green and red. Returns the cloudy share of pixels (0-1)."""
    return float(((b["blue"]>.25)&(b["green"]>.25)&(b["red"]>.25)).mean())
def align(b,a):
    """Resample 'after' to the 'before' grid, then crop both to a common extent (grid-level co-registration)."""
    sh=b["red"].shape
    if a["red"].shape!=sh:
        z=(sh[0]/a["red"].shape[0],sh[1]/a["red"].shape[1]);a={k:ndimage.zoom(v,z,order=1) for k,v in a.items()}
    h,w=min(sh[0],a["red"].shape[0]),min(sh[1],a["red"].shape[1])
    return {k:v[:h,:w] for k,v in b.items()},{k:v[:h,:w] for k,v in a.items()}
def save_processed(b,name):
    os.makedirs(PROC,exist_ok=True);p=os.path.join(PROC,name+".npz");np.savez_compressed(p,**b);return p
def preview_png(b,size=480):
    from PIL import Image
    a=(np.clip(np.dstack([b["nir"],b["red"],b["green"]])/0.6,0,1)*255).astype("uint8")
    buf=io.BytesIO();Image.fromarray(a).resize((size,size),Image.NEAREST).save(buf,"PNG");return buf.getvalue()
