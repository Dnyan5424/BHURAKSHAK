"""GIS context: distances to water, roads, forest and protected areas using Shapely geometries."""
import math
from shapely.geometry import shape,MultiPoint,Point
from shapely.ops import nearest_points,unary_union
def hav(a,b):
    p1,p2=math.radians(a[1]),math.radians(b[1]);h=math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin(math.radians(b[0]-a[0])/2)**2
    return 2*6371000*math.asin(math.sqrt(h))
def centroid(poly):
    r=poly["coordinates"][0];return [sum(p[0] for p in r)/len(r),sum(p[1] for p in r)/len(r)]
def _geom(v):
    """Layer = list of [lon,lat] points, or GeoJSON Geometry/Feature/FeatureCollection (e.g. OSM export)."""
    if isinstance(v,dict):
        if v.get("type")=="FeatureCollection":return unary_union([shape(f["geometry"]) for f in v["features"]])
        return shape(v.get("geometry",v))
    return MultiPoint(v)
def dist_m(c,layer):
    p=nearest_points(Point(c),_geom(layer))[1];return round(hav(c,[p.x,p.y]))
def gis_context(poly,layers):
    c=centroid(poly);w,r,f=dist_m(c,layers["water"]),dist_m(c,layers["road"]),dist_m(c,layers["forest"]);prot=dist_m(c,layers["protected"])<500
    return dict(distance_to_water_m=w,distance_to_road_m=r,distance_to_forest_m=f,near_protected_area=prot,existing_lulc_class="Vegetation / scrub (demo layer)",
                explanation=f"Nearest water body {w} m, road {r} m, forest {f} m. "+("Within 500 m of a protected area." if prot else "Not near a protected area in the available dataset."))
