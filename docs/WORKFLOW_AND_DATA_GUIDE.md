# BhuRakshak workflow, roles, and data guide

This guide describes the behavior implemented in this repository. It covers the local demo setup, the citizen petition flow, admin satellite-evidence workflow, officer review, API permissions, and how records are stored.

## 1. Important operating principles

- A satellite detection is a **preliminary signal**, not proof of a violation. An authorised officer makes the case decision.
- The seed data and demo accounts are synthetic. Do not treat them as real environmental or enforcement statistics.
- Satellite provider names are metadata supplied with an uploaded scene. The application does not currently sign in to Copernicus, NASA, or USGS or fetch imagery from those providers.
- The demo seed command drops and recreates every database table. Do not run it against a database whose contents you want to keep.
- Uploaded scenes and evidence files are stored on disk; database rows hold their metadata and file paths. Back up both the database and `backend/data/`.

## 2. Start the application locally

Use two terminals from the project root:

```powershell
Set-Location .\backend
python -m pip install -r requirements.txt
python -m seed.seed
python -m uvicorn app.main:app --reload
```

In the second terminal:

```powershell
Set-Location .\frontend
npm install
npm run dev
```

The frontend prints its local URL (commonly `http://localhost:5173`). The API is at `http://localhost:8000`; interactive API documentation is at `http://localhost:8000/docs`.

The backend reads `SECRET_KEY` and `DATABASE_URL` from the environment. Defaults are a development-only signing key and SQLite at `backend/bhurakshak.db` when the backend is launched from its directory. Configure production values outside source control; never use the development key for a deployed service.

### Demo accounts

| Role | Email | Password | Main workspace |
|---|---|---|---|
| Citizen | `citizen@demo.com` | `Citizen@123` | Public map, petition/report and tracking |
| Officer | `officer@demo.com` | `Officer@123` | Case evidence and verification decisions |
| Administrator | `admin@demo.com` | `Admin@123` | Satellite Intelligence, evidence intake, assignment and dashboard |

These accounts are created by the seed script. Registration creates a **citizen** account only; there is no public officer/admin registration flow.

## 3. End-to-end workflow

```text
Public map / citizen observation
              |
              v
      Citizen petition ---------> track by petition reference + mobile
              |                                  ^
              | may link to a nearby detection   | status update
              v                                  |
      Case + detection <---- admin assigns ------+
              ^
              |
Admin uploads baseline/recent scenes
              |
              v
Preliminary spectral/GIS analysis creates detections and review cases
              |
              v
Admin attaches case evidence (optional satellite-scene link)
              |
              v
Officer reviews satellite + GIS + citizen/field evidence
              |
              v
Decision, remarks/references, case and petition status update
```

The citizen and satellite paths can start independently. A petition may be associated with a nearby detection, while an admin analysis creates a detection and case without requiring a citizen petition.

### Citizen: submit and track a petition

1. Open **Report an Issue**. The report form is available without signing in.
2. Select the approximate location, enter village/city and district, choose a category, and describe the observation.
3. Provide a mobile number and consent. A photo can be attached after the petition is created.
4. On submission, the API creates a petition reference. It checks for a detected polygon within 500 metres; when one is found, it may link the petition to an existing case and mark the petition `Under AI Review`. Otherwise the initial state is `Submitted`.
5. Keep the petition reference and mobile number. Use **Track Petition** to retrieve its status. A citizen account is not required for this lookup.
6. The official-government-portal list provides direction only; it does not submit a complaint to those external services.

Citizen petition endpoint summary:

| Method and path | Purpose | Authentication |
|---|---|---|
| `POST /api/petitions` | Create a petition; consent is required | Not required |
| `POST /api/petitions/{code}/documents?mobile=...` | Attach a petition document/photo | Reference and mobile check |
| `GET /api/petitions/track/{code}?mobile=...` | Track a petition | Reference and mobile check |
| `GET /api/portals?category=...` | List external agency portal information | Not required |
| `POST /api/auth/register` | Register a citizen account | Not required |
| `POST /api/auth/login` | Sign in | Not required |

### Administrator: create satellite-based preliminary cases

1. Sign in with an administrator account and open **Admin → Satellite Intelligence**.
2. Define an area using the map/coordinates or draw a polygon. The area is used for analysis; it does not georeference an incorrectly prepared raster.
3. Upload a baseline scene and a recent scene. Record the correct study-area name, acquisition date, sensor, cloud cover, spatial resolution and source metadata.
4. Select a baseline and a later scene for the same study area, sensor and spatial resolution. Set a cloud-cover maximum that both scenes meet.
5. Review the previews and run the comparison. The backend calculates rule-based NDVI, NDWI, NDBI and bare-soil index differences and adds GIS context where configured.
6. Each detected change creates a detection record and a case in `Needs verification` state. These are preliminary results and need officer review.
7. Choose a case and upload relevant field photos, drone images, inspection documents, geotagged images or PDFs. Capture date and coordinates are optional; link a satellite scene when relevant.

Current scene input and analysis constraints:

- Scene uploads accept `.npz`, `.tif` and `.tiff`, up to 200 MB.
- NPZ files need same-sized, two-dimensional `blue`, `green`, `red`, `nir`, and `swir` arrays containing finite values.
- GeoTIFF inputs with at least five bands are interpreted as blue, green, red, NIR and SWIR in bands 1–5. Fewer-band inputs fall back to an RGB approximation and carry an accuracy warning.
- The selected scenes must have the same study area, sensor and resolution, be ordered baseline-to-recent, and satisfy the chosen cloud threshold.
- The processing uses a fixed analysis pixel size/grid and grid-level resizing/cropping, not a general geospatial reprojection or production-grade co-registration pipeline. Confirm that inputs are correctly aligned before interpreting results.
- Polygon masking is supported, but the analysis origin must match the polygon's upper-left coordinate. GIS reference layers currently come from `backend/data/raw/demo_layers.json`.
- Entering “Copernicus Data Space”, “NASA Earthdata” or “USGS EarthExplorer” as the source does not retrieve data from that provider. Provider authentication/catalog integration is not implemented.

Evidence upload constraints:

- Accepted formats: JPG/JPEG, PNG, WebP, TIFF and PDF; maximum 25 MB per file.
- The backend checks file signatures as well as extensions.
- Evidence metadata includes case, optional scene, file name/type, uploader, upload time, and optional capture date and coordinates.
- The upload route is administrator-only. Officers and administrators can list and download evidence for cases.

### Officer: review and decide

1. Sign in as an officer and open **Officer**.
2. Review the case's preliminary risk, satellite observation metadata, index deltas, GIS context, linked petition and available evidence.
3. Use the field-report upload where additional field material is needed.
4. Submit one of the supported decisions:
   - `Legal / Permitted Change` requires remarks and a permit/record reference.
   - `Potential Violation` requires remarks and a recommended department action.
   - `False Positive`, `Needs More Evidence`, or `Closed`.
5. On decision, the API updates the case and detection status. If a petition is linked, its status is updated and a notification record is created.

The decision represents the officer's recorded review, not an automated satellite conclusion. The close endpoint sets the decision to `Closed`.

### Administrator: assign and manage

- The admin dashboard shows current petition/detection/case counts and the case register.
- Admins can assign a case to a user whose role is `officer`.
- Admins can maintain external portal directory entries.
- Admins can upload and link evidence and inspect the user list.
- The assignment is recorded on the case. **Current implementation note:** the officer case-list endpoint returns all cases to any authenticated officer/admin; it does not yet filter the queue to only the signed-in officer's assignments.

## 4. Role access and API authorization

The frontend stores the returned access token and role in browser `localStorage`. API requests include the token as `Authorization: Bearer <token>`. Tokens expire after 24 hours. The backend's `need(...)` dependency enforces roles for protected API routes.

| Capability | Public / unauthenticated | Citizen | Officer | Admin |
|---|:---:|:---:|:---:|:---:|
| Read public detections, scene metadata/previews, GIS context | Yes | Yes | Yes | Yes |
| Submit and track petitions | Yes, with petition reference + mobile | Yes | Yes | Yes |
| Read officer case queue/detail | No | No | Yes | Yes |
| Submit officer decisions / field reports | No | No | Yes | Yes |
| Read/download case evidence | No | No | Yes | Yes |
| Upload case evidence or satellite scenes | No | No | No | Yes |
| Run change detection | No | No | No | Yes |
| Admin dashboard, user list, assignment, portal maintenance | No | No | No | Yes |
| Download case PDF/CSV reports | No | No | Yes | Yes |

The navigation links are visible regardless of role; authorization is enforced by the API, not by hiding frontend routes. A failed role check returns HTTP 403, and a missing/invalid token returns HTTP 401. Do not rely on the browser role value as a security boundary.

### Main API paths

| Method and path | Role | Effect |
|---|---|---|
| `GET /api/auth/me` | Signed in | Return the current user's profile and role |
| `GET /api/change-detections` | Public | List detections for the map |
| `GET /api/change-detections/{id}` | Public | Detection detail and before/after scene metadata |
| `GET /api/change-detections/{id}/evidence` | Public | Preliminary spectral evidence summary |
| `GET /api/change-detections/{id}/gis-context` | Public | GIS context |
| `GET /api/scenes` and `GET /api/scenes/{id}/preview` | Public | Scene metadata and preview |
| `POST /api/scenes/upload` | Admin | Upload a satellite raster scene |
| `POST /api/change-detection/run` | Admin | Analyze a scene pair; create detections/cases |
| `GET /api/officer/cases` and `/api/officer/cases/{id}` | Officer, admin | Read case queue/detail |
| `PATCH /api/officer/cases/{id}/decision` | Officer, admin | Record a decision and update linked records |
| `POST /api/officer/cases/{id}/field-report` | Officer, admin | Upload a field report/photo |
| `POST /api/admin/cases/{id}/evidence` | Admin | Upload case-linked evidence |
| `GET /api/admin/cases/{id}/evidence` | Officer, admin | List case-linked evidence |
| `GET /api/admin/evidence/{id}/download` | Officer, admin | Download evidence |
| `GET /api/admin/dashboard`, `/api/admin/users` | Admin | Read summary and user records |
| `POST /api/admin/assign-case` | Admin | Assign case to an officer |
| `GET /api/reports/{id}/pdf` and `/csv` | Officer, admin | Download case report |

The full request schemas and response examples are available from `/docs`.

## 5. Database model and record lifecycle

The ORM models are in `backend/app/models/__init__.py`. They correspond to these main tables:

| Table | Stores | Typical links |
|---|---|---|
| `users` | Citizen/officer/admin profiles, role and password hash | Petition owner, case assignee, evidence uploader |
| `petitions` | Citizen observation, location, category, consent, status and reference | Optional detection and case |
| `scenes` | Uploaded scene metadata and local raster path | Before/after detection and optional evidence association |
| `detections` | Change category, polygon, affected area, confidence/risk, index differences and status | Two scenes, GIS record, case |
| `gis` | Distances/context and explanation for a detection | Detection |
| `cases` | Review status, assignment, officer decision, remarks, references and decision time | Detection and optional petition |
| `evidences` | Case-linked evidence metadata and local storage path | Case, optional scene, uploader |
| `portals` | External agency and submission guidance | Petition category lookup |
| `notifications` | Messages addressed to a mobile number | Petition status updates/account notifications |

The expected process is `scene pair → detection → GIS context → case`, with an optional `petition → existing nearby detection/case` relationship. The uploaded-file bytes themselves are not inside the database.

### Seeded versus operational records

`backend/seed/seed.py` creates synthetic user accounts, satellite-like arrays, GIS demo points, portal references, detections/cases, petitions and a notification. It also overwrites the demo NPZ source arrays and demo layer JSON.

**The seed script starts with `drop_all` and `create_all`.** This deletes every row in all ORM tables, including records you added after seeding. It does not act as a safe incremental seeder. Do not use it to “refresh” a live or valuable database.

For routine development:

- Use the seeded database only when you can discard its contents.
- To preserve current data, do not run `python -m seed.seed`; use the UI/API or a deliberate, separately reviewed migration/fixture process.
- User registration creates citizens only. Provision officers/admins through a controlled administrative process; never expose a public role-selection field.
- No schema migration framework is currently configured. `Base.metadata.create_all()` creates missing tables during startup but is not a schema migration tool and will not safely alter existing table definitions.

### Inspect records

Use the API documentation for normal application-level inspection. For a read-only SQLite query, open `backend/bhurakshak.db` with a SQLite viewer or execute SQL using a trusted local SQLite client. Example read-only queries:

```sql
SELECT id, name, email, role FROM users ORDER BY id;

SELECT id, petition_code, status, category, district
FROM petitions
ORDER BY created_at DESC;

SELECT id, change_type, risk_level, status, area_hectares, created_at
FROM detections
ORDER BY created_at DESC;

SELECT id, change_detection_id, petition_id, assigned_officer_id, status, officer_decision
FROM cases
ORDER BY created_at DESC;

SELECT id, case_id, scene_id, original_filename, evidence_type, uploaded_by, created_at
FROM evidences
ORDER BY created_at DESC;
```

Use read-only queries for investigation. Direct database edits bypass validation, authorization, notifications and audit context in the application.

### PostgreSQL/PostGIS

`DATABASE_URL` can point to PostgreSQL. `database/schema.sql` is a PostgreSQL/PostGIS schema reference, but the current runtime ORM definitions are the application's active schema and do not implement full PostGIS geometry columns or migration management. Do not assume that switching the connection string alone deploys a production-ready PostGIS setup; reconcile the ORM/schema, add migrations, configure database access and test against the target engine first.

## 6. Example API interaction

The following PowerShell example logs in as the seeded admin, then reads the protected dashboard. Run it after the backend is running and the database has been seeded:

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8000/api/auth/login" `
  -ContentType "application/json" `
  -Body (@{ email = "admin@demo.com"; password = "Admin@123" } | ConvertTo-Json)

$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Method Get -Uri "http://localhost:8000/api/admin/dashboard" -Headers $headers
```

The same `$headers` can be used for other protected API calls. Never paste production tokens or passwords into tickets, logs or source files.

## 7. Production-readiness checklist

Before using real users or evidence:

- Replace `SECRET_KEY` with a long random secret stored outside the repository.
- Restrict CORS to the deployed frontend origin; the current application allows all origins.
- Use HTTPS, a managed database, backups, retention rules and access controls.
- Back up and protect `backend/data/`, not only the database.
- Add database migrations and test schema upgrades on a copy of production data.
- Review upload authentication, file scanning, quotas, storage isolation and retention requirements.
- Restrict case queues to assigned/authorized officers if assignment is intended to be a real access boundary.
- Add an auditable administrative workflow for provisioning officer/admin accounts.
- Integrate a real satellite catalog/provider only after implementing credentials, retrieval, licensing, data-quality checks, processing and failure handling.
- Validate raster CRS, georeferencing, sensor bands, cloud/shadow masks, registration and uncertainty before relying on measured changes.
- Preserve officer accountability: an automated change signal must never be presented as a final legal finding.

## 8. Useful commands

Run backend tests from `backend/`:

```powershell
python -m pytest
```

Check frontend types and production build from `frontend/`:

```powershell
npm run check
npm run build
```
