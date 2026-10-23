# BhuRakshak backend (FastAPI)

## Start the full app

From the project root, use the [local launcher](../run.ps1) to start both the frontend and API:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1
```

It creates synthetic demo data only when the default local database is missing. It never reseeds an existing database.

## Start only the backend

From this folder, after installing the packages in `requirements.txt`, run:

```powershell
python -m uvicorn app.main:app --reload
```

The interactive API documentation is at <http://localhost:8000/docs>. Do not run `python -m seed.seed` against a database that contains data; the command drops and recreates all ORM tables.

Layout: `app/routers` (HTTP), `app/services` (satellite, change detection, GIS, risk, report), `app/models`, `app/schemas`, `app/utils`, `seed/`, `tests/`, `data/` (raw, processed, uploads, reports).
Config via env: SECRET_KEY, DATABASE_URL (SQLite default; PostgreSQL supported). Detection thresholds in `app/config.py`.
Demo logins: citizen@demo.com / Citizen@123, officer@demo.com / Officer@123, admin@demo.com / Admin@123 (synthetic data).

See the [workflow and data guide](../docs/WORKFLOW_AND_DATA_GUIDE.md) for role hand-offs, endpoint permissions, database tables, storage behavior and operational notes. **Warning:** `python -m seed.seed` drops and recreates all ORM tables; do not run it against data you need to retain.

Admin Satellite Intelligence is available in the frontend admin workspace. Upload baseline and recent multiband .npz/GeoTIFF scenes using POST /api/scenes/upload, then run POST /api/change-detection/run with scene ids, an analysis origin, a cloud-cover threshold and (optionally) a GeoJSON polygon boundary. The run creates preliminary detections and officer-review cases.
POST /api/admin/cases/{case_id}/evidence attaches validated image/PDF files and capture metadata to a case. Authorized admins and officers can list case evidence and download files through /api/admin/cases/{case_id}/evidence and /api/admin/evidence/{evidence_id}/download.
Provider names are metadata only: this project does not authenticate to Copernicus, NASA or USGS or retrieve imagery from their catalogs. Uploaded rasters must be preprocessed, band-compatible and spatially aligned. Polygon masking uses the detector's current fixed grid and is not a substitute for geospatial reprojection.
Layers file data/raw/demo_layers.json holds water/road/forest/protected as point lists or GeoJSON.
The system only flags potential land-use change; only an officer sets a final decision.
