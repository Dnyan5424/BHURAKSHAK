"""Authoritative municipal boundary import and persisted 1 km grid generation."""
import json
import math

from shapely.geometry import box, mapping, shape
from shapely.ops import transform, unary_union

GRID_SIZE_METRES = 1000
UTM_ZONE_43N = "EPSG:32643"


def _projector(source, target):
    from pyproj import Transformer
    return Transformer.from_crs(source, target, always_xy=True).transform


def _features(payload):
    if payload.get("type") == "FeatureCollection":
        return payload.get("features", [])
    if payload.get("type") == "Feature":
        return [payload]
    return [{"type": "Feature", "properties": {}, "geometry": payload}]


def seed_bundled_monitoring_grids(session, dataset_path):
    """Add missing bundled grid tiles without replacing existing records."""
    from ..models import MunicipalWard, MonitoringGrid

    with open(dataset_path, encoding="utf-8") as source:
        payload = json.load(source)
    if payload.get("type") != "FeatureCollection":
        raise ValueError("Bundled monitoring grid data must be a GeoJSON FeatureCollection")
    features = [
        feature for feature in payload.get("features", [])
        if (feature.get("properties") or {}).get("feature_type") == "grid"
    ]
    if not features:
        return {"inserted": 0, "existing": 0}

    existing_ids = {row[0] for row in session.query(MonitoringGrid.grid_id).all()}
    ward_rows = session.query(MunicipalWard).filter(MunicipalWard.municipality.in_(["PMC", "PCMC"])).all()
    wards = {(row.municipality, row.ward_code, row.ward_type): row for row in ward_rows}
    inserted = 0
    for feature in features:
        properties = feature.get("properties") or {}
        grid_id = properties.get("grid_id")
        municipality = properties.get("municipality")
        if not grid_id or municipality not in {"PMC", "PCMC"}:
            continue
        if grid_id in existing_ids:
            continue
        geometry = shape(feature["geometry"])
        if geometry.geom_type not in {"Polygon", "MultiPolygon"} or geometry.is_empty or not geometry.is_valid:
            raise ValueError(f"Bundled grid {grid_id} has an invalid polygon geometry")
        ward_code = str(properties.get("ward_code") or "")
        ward_type = str(properties.get("ward_type") or "electoral")
        ward_key = (municipality, ward_code, ward_type)
        ward = wards.get(ward_key)
        if not ward and ward_code:
            ward = MunicipalWard(
                municipality=municipality,
                ward_code=ward_code,
                ward_name=properties.get("ward_name") or f"{municipality} Ward {ward_code}",
                ward_type=ward_type,
                source=properties.get("source") or "Bundled PMC/PCMC grid dataset",
                source_year=properties.get("source_year"),
            )
            session.add(ward)
            session.flush()
            wards[ward_key] = ward
        session.add(MonitoringGrid(
            grid_id=grid_id,
            municipality=municipality,
            ward_id=ward.id if ward else None,
            ward_code=ward_code,
            grid_size_m=1000,
            grid_name=properties.get("grid_name") or grid_id,
            geometry_geojson=json.dumps(mapping(geometry), separators=(",", ":")),
            area_sq_km=float(properties.get("area_sq_km") or 0),
            status=properties.get("status") or "Not Started",
            active=True,
        ))
        existing_ids.add(grid_id)
        inserted += 1
    session.commit()
    return {"inserted": inserted, "existing": len(features) - inserted}


def import_municipality(session, payload, municipality, source, source_year, ward_type="administrative"):
    """Replace one municipality's imported boundary layer idempotently and generate grids."""
    from ..models import MunicipalBoundary, MunicipalWard, MonitoringGrid

    features = _features(payload)
    if not features:
        raise ValueError("The uploaded GeoJSON contains no features")
    parsed = [(feature.get("properties") or {}, shape(feature["geometry"])) for feature in features]
    if any(geometry.is_empty or not geometry.is_valid for _, geometry in parsed):
        raise ValueError("All imported municipal and ward geometries must be non-empty and valid")
    existing_geometry = [
        shape(json.loads(row.geometry_geojson))
        for row in session.query(MunicipalWard).filter_by(municipality=municipality).all()
    ]
    municipality_geometry = unary_union(existing_geometry + [geometry for _, geometry in parsed])
    projected = transform(_projector("EPSG:4326", UTM_ZONE_43N), municipality_geometry)
    municipal_area = MunicipalBoundary(
        municipality=municipality, source=source, source_year=source_year,
        geometry_geojson=json.dumps(mapping(municipality_geometry), separators=(",", ":")),
        area_sq_km=round(projected.area / 1_000_000, 6),
    )
    session.query(MonitoringGrid).filter_by(municipality=municipality).delete()
    session.query(MunicipalWard).filter_by(municipality=municipality, ward_type=ward_type).delete()
    session.query(MunicipalBoundary).filter_by(municipality=municipality).delete()
    session.add(municipal_area)
    session.flush()
    for index, (properties, ward_geometry) in enumerate(parsed, start=1):
        ward_code = str(properties.get("ward_code") or properties.get("ward_id") or properties.get("id") or index)
        ward_name = str(properties.get("ward_name") or properties.get("name") or f"{municipality} Ward {ward_code}")
        ward_projected = transform(_projector("EPSG:4326", UTM_ZONE_43N), ward_geometry)
        session.add(MunicipalWard(
            municipality=municipality, ward_code=ward_code, ward_name=ward_name,
            ward_type=str(properties.get("ward_type") or ward_type), source=source, source_year=source_year,
            boundary_id=municipal_area.id, geometry_geojson=json.dumps(mapping(ward_geometry), separators=(",", ":")),
            area_sq_km=round(ward_projected.area / 1_000_000, 6),
        ))
    session.flush()
    total_grids = 0
    all_wards = session.query(MunicipalWard).filter_by(municipality=municipality).all()
    grid_wards = [ward for ward in all_wards if ward.ward_type in {"electoral", "final"}]
    if not grid_wards:
        grid_wards = [ward for ward in all_wards if ward.ward_type == "administrative"]
    for ward in all_wards:
        ward.boundary_id = municipal_area.id
    for ward in grid_wards:
        ward_geometry = shape(json.loads(ward.geometry_geojson))
        ward_projected = transform(_projector("EPSG:4326", UTM_ZONE_43N), ward_geometry)
        ward_code, ward_name = ward.ward_code, ward.ward_name
        min_x, min_y, max_x, max_y = ward_projected.bounds
        columns = range(math.floor(min_x / GRID_SIZE_METRES), math.ceil(max_x / GRID_SIZE_METRES))
        rows = range(math.floor(min_y / GRID_SIZE_METRES), math.ceil(max_y / GRID_SIZE_METRES))
        for col in columns:
            for row in rows:
                cell = box(col * GRID_SIZE_METRES, row * GRID_SIZE_METRES, (col + 1) * GRID_SIZE_METRES, (row + 1) * GRID_SIZE_METRES)
                clipped = cell.intersection(ward_projected)
                if clipped.is_empty or clipped.area < 1:
                    continue
                geographic = transform(_projector(UTM_ZONE_43N, "EPSG:4326"), clipped)
                grid_id = f"{municipality}-{ward_code}-{col}-{row}"
                session.add(MonitoringGrid(
                    grid_id=grid_id, municipality=municipality, ward_id=ward.id, ward_code=ward_code,
                    grid_size_m=GRID_SIZE_METRES, grid_name=f"{ward_name} · {grid_id}",
                    geometry_geojson=json.dumps(mapping(geographic), separators=(",", ":")),
                    area_sq_km=round(clipped.area / 1_000_000, 6),
                ))
                total_grids += 1
    session.commit()
    return {"municipality": municipality, "wards": len(all_wards), "grids": total_grids, "source": source, "source_year": source_year}
