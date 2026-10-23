"""Confidence and priority scoring (weights from the project spec)."""
def score(det,g,quality=.8,cloud=.9,season=.7,spatial=.8):
    gc=1.0 if g["near_protected_area"] or g["distance_to_water_m"]<200 else .5
    conf=100*(.35*det["magnitude"]+.2*quality+.15*cloud+.1*season+.1*spatial+.1*gc)
    sens=1 if g["near_protected_area"] else max(0,1-g["distance_to_water_m"]/1000)
    size=min(1,det["area_hectares"]/5);prox=max(0,1-min(g["distance_to_water_m"],g["distance_to_forest_m"])/1000)
    pr=.4*conf+25*sens+20*size+15*prox
    return round(conf,1),round(pr,1),("Low" if pr<=25 else "Moderate" if pr<=50 else "High" if pr<=75 else "Critical")
def explain(det,g,lvl):
    near=" near a water body" if g["distance_to_water_m"]<300 else " near a sensitive area" if g["near_protected_area"] else ""
    return f"{lvl} priority because {det['change_type'].lower()} was detected{near}. No matching public permit record was found in the available dataset. Field verification is required."
