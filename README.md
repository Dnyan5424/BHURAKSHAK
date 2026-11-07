# BhuRakshak (भू-रक्षक)

> **Civic Land-Use Intelligence & Automated Satellite Change Verification System**  
> A simple, reliable, and accessible platform connecting citizen environmental reports with satellite remote-sensing AI and accountable field officer verification.

```
┌────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│ Citizen Complaint  │ ──► │ Satellite AI Change  │ ──► │  GIS & Cadastral     │ ──► │ Officer Verification │
│  (< 2 Minutes)     │     │ Detection Pipeline   │     │  Spatial Evidence    │     │  & Citizen Dispatch  │
└────────────────────┘     └──────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

---

## Table of Contents

1. [System Overview & Key Features](#system-overview--key-features)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Local Development)](#quick-start-local-development)
   - [Windows (PowerShell)](#windows-powershell)
   - [Linux / macOS (Bash)](#linux--macos-bash)
4. [Environment Variables & Configuration](#environment-variables--configuration)
5. [Database Options (SQLite & PostgreSQL / PostGIS)](#database-options)
6. [Core Role Workflows & Navigation](#core-role-workflows--navigation)
7. [Demo Accounts & Test Petitions](#demo-accounts--test-petitions)
8. [API Documentation](#api-documentation)
9. [Running Automated Tests](#running-automated-tests)
10. [Troubleshooting & FAQ](#troubleshooting--faq)
11. [License](#license)

---

## System Overview & Key Features

BhuRakshak eliminates administrative friction, complex GIS software overhead, and technical jargon in monitoring environmental land-use violations:

- **Citizen Reporting (< 2 Minutes)**: 3-step mobile-first form with GPS auto-location / map pin, photographic evidence upload, 6 plain-language disturbance categories, and instant verifiable Petition ID receipt.
- **Petition Tracking**: Lookup petition status using only the **Petition ID** and registered **10-digit mobile number**. Visual 5-waypoint progress tracker, officer notes, and downloadable PDF Dossier.
- **Satellite AI Change Pipeline (3 Clicks)**: Select a registered cadastral monitoring area, choose baseline ("Before") and latest pass ("After") scenes, and execute automated multi-spectral change analysis.
- **Officer Verification Dashboard**: All-in-one verification dossier presenting citizen claims, ground photos, side-by-side satellite split frames, GIS proximity buffers, and 1-click statutory determinations.
- **Automatic Environmental Review**: Admins can choose a 15-minute-to-daily fetch interval or run a review immediately. New deforestation/tree-cover loss and illegal mining/excavation observations appear on the public map and notify officer queues automatically.
- **Real Satellite Acquisition**: Authorized officers can search and download public Sentinel-2 L2A scenes from Microsoft Planetary Computer for Pune, with cloud filtering, AOI clipping, temporary asset signing, cloud/shadow masking, and conversion into the existing five-band detection input.
- **Plain-Language Intelligence**: Translates dense spectral indices ($\Delta\text{NDVI}, \Delta\text{NDWI}, \Delta\text{NDBI}, \Delta\text{BSI}$) into human-readable alerts (*"Possible Tree Cutting Found"*, *"Water Body Alteration"*), with technical metrics available via progressive disclosure.
- **Unique Environmental Design**: Cartographic topographic contours, warm limestone (`#F7F5F0`) and forest canopy palette, SVG vector iconography, and mobile bottom navigation. Zero emojis, zero nested box clutter.

---

## Prerequisites

Ensure the following runtimes are installed on your host system:

- **Python**: Version `3.10` or higher (`python --version` or `python3 --version`)
- **Node.js**: Version `18.x` or higher (`node --version`)
- **npm**: Version `9.x` or higher (`npm --version`)
- **Git**: For version control (`git --version`)

---

## Quick Start (Local Development)

### Windows (PowerShell)

#### Option A: One-Click Script
From the project root:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1
```

#### Option B: Manual Setup

1. **Clone the Repository**:
   ```powershell
   git clone https://github.com/Dnyan5424/BHURAKSHAK.git
   cd BHURAKSHAK
   ```

2. **Backend Setup**:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install --upgrade pip
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Backend will run at: `http://localhost:8000` (API Docs: `http://localhost:8000/docs`)*

3. **Frontend Setup** (in a separate terminal window):
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
   *Frontend will run at: `http://localhost:5173`*

---

### Linux / macOS (Bash)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Dnyan5424/BHURAKSHAK.git
   cd BHURAKSHAK
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Frontend Setup** (in a separate terminal window):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## Environment Variables & Configuration

Create a `.env` file in the `backend/` directory based on `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

### Backend Environment Variables

| Variable Name | Type | Default Value | Description |
|---|---|---|---|
| `SECRET_KEY` | `string` | `dev-change-me` | Cryptographic secret key used to sign and verify JWT authentication tokens. Must be changed in production. |
| `DATABASE_URL` | `string` | `sqlite:///./bhurakshak.db` | SQLAlchemy connection URI. Supports SQLite local file or PostgreSQL / PostGIS connection strings. |
| `PORT` | `integer` | `8000` | Port for the Uvicorn ASGI server to bind to. |
| `HOST` | `string` | `0.0.0.0` | Host IP address binding. `0.0.0.0` allows local network access. |
| `CORS_ORIGINS` | `string` | `*` | Comma-separated list of permitted origins (e.g. `http://localhost:5173,https://bhurakshak.gov.in`). |
| `MAX_UPLOAD_SIZE_MB` | `integer` | `15` | Maximum permissible upload size for field photos and satellite raster files. |

### Real Satellite Acquisition

The backend uses public Microsoft Planetary Computer STAC discovery and does not require credentials:

```powershell
cd backend
pip install -r requirements.txt
```

Officer/admin endpoints:

- `POST /api/satellite/search` — search Pune Sentinel-2 L2A scenes by date and cloud cover.
- `POST /api/satellite/scenes/{scene_id}/download` — download a selected AOI window into `backend/data/raw/satellite/{manual|historical|automatic}/`.
- `GET /api/satellite/scenes/{scene_id}/preview` — open a provider-generated real-scene PNG preview.
- `GET /api/satellite/scenes/{scene_id}/image` — download the signed provider visual asset.
- `GET /api/satellite/scenes/{scene_id}/npz` — download the converted five-band NPZ after acquisition.
- `POST /api/satellite/process` — compare two downloaded real scenes through the existing detection engine.
- `GET /api/automatic-review` and `PUT /api/automatic-review` — view or set the review interval (15 minutes, 1 hour, 6 hours, or daily).

Provider discovery itself runs once daily after 06:00 IST, downloads at most two automatic jobs per day, deduplicates by provider scene ID, and retains existing demo scenes. Manual officer downloads are limited to five jobs per officer per day.

The upload workflow accepts both `.npz` files containing `blue`, `green`, `red`, `nir`, and `swir` arrays and five-band `.tif`/`.tiff` rasters. Uploading does not fabricate a result: the existing spectral detector must successfully process the selected baseline and recent files.

### Frontend Environment Variables

Optionally create `frontend/.env`:

| Variable Name | Type | Default Value | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | `string` | *(empty string / relative origin)* | Base URL for the FastAPI backend. In local dev, defaults to `http://localhost:8000` via proxy/CORS. |

---

## Database Options

### 1. SQLite (Default - Zero Configuration)
By default, BhuRakshak uses the embedded SQLite database at `backend/bhurakshak.db`.
- No separate database server required.
- Pre-seeded with realistic monitoring areas, satellite observations, citizen petitions, and verification cases.
- Schema is automatically initialized on application startup.

### 2. PostgreSQL + PostGIS (Production Grade)
To use PostgreSQL with spatial indexing:
1. Ensure PostgreSQL with the `postgis` extension is installed.
2. Create the database:
   ```sql
   CREATE DATABASE bhurakshak;
   \c bhurakshak;
   CREATE EXTENSION postgis;
   ```
3. Run the schema script:
   ```bash
   psql -d bhurakshak -f database/schema.sql
   ```
4. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/bhurakshak
   ```

---

## Core Role Workflows & Navigation

The platform provides 3 focused, role-based experiences:

### 1. Citizen Workflow
- **Home (`/`)**: Overview, quick links, statutory disclaimers, and 3-step submission guide.
- **Report a Problem (`/report`)**:
  - Step 1: Pinpoint location on interactive Leaflet map or tap "Use Current GPS Location".
  - Step 2: Select disturbance category (Tree Cutting, Construction, Water Body Issue, Quarrying/Mining, etc.) and upload photo.
  - Step 3: Enter contact phone number to receive tracking SMS/updates and download official PDF receipt.
- **Track My Report (`/track`)**:
  - Enter Petition ID (e.g., `PET-2025-00001`) and registered phone number.
  - View real-time status, 5-waypoint trail timeline, assigned officer remarks, and full cadastral dossier.
- **My Notifications (`/notifications`)**: Real-time ledger of status alerts and officer decisions filtered by phone number.
- **Official Links (`/official-links`)**: State and national government redressal portals (PARIVESH, Aaple Sarkar, MahaMining, CPGRAMS).

### 2. Verification Officer Workflow
- **My Cases (`/officer`)**: Filter incoming cases by attention priority (`Critical`, `High`, `Needs Checking`, `Normal`) or status.
- **Case Review Dossier (`/case/:id`)**:
  - Unified inspection screen comparing ground evidence against satellite AI change polygon.
  - Toggle between Street Map, Baseline Satellite ("Before"), and Latest Pass ("After").
  - Review automated GIS spatial proximity (distance to water bodies, protected forest boundaries, roadways).
  - Submit official determination: `Legal / Permitted`, `Potential Violation`, `False Alarm`, or `Need More Checking`.
  - Issue official remarks and download signed investigation certificate.

### 3. Administrator Workflow
- **Admin Dashboard (`/admin`)**: High-level telemetry (Total Reports, Pending Verifications, Critical Alerts, Monitored Hectares).
- **Monitoring Areas (`/admin/areas`)**: Inspect PMC/PCMC 1 km tiles and start per-grid satellite analysis. The bundled grid dataset at `backend/data/aoi/pmc_pcmc_grid_seed.geojson` is loaded into the grid register on backend startup; existing grid rows are preserved.
- **Satellite Change Engine (`/admin/satellite`)**: 3-click change detection execution comparing Sentinel-2 / Landsat rasters.
- **Case Management (`/admin/cases`)**: Assign cases to regional officers, re-prioritize alerts, and export records to CSV.

---

## Demo Accounts & Test Petitions

The login screen (`/login`) includes **1-click demo role selectors** for instant evaluation without typing:

| Role | Email Address | Password | Permissions |
|---|---|---|---|
| **Citizen** | `citizen@demo.com` | `Citizen@123` | File petitions, track status, view public observation map |
| **Officer** | `officer@demo.com` | `Officer@123` | Review assigned cases, verify evidence, record statutory decisions |
| **Admin** | `admin@demo.com` | `Admin@123` | Upload satellite scenes, run AI change detection, assign officers |

### Sample Petitions for Tracking (`/track`)

| Petition Code | Mobile Number | Location | Category | Current Status |
|---|---|---|---|---|
| `PET-2025-00001` | `9000000001` | Mulshi Valley, Pune | Tree Cutting & Forest Clearing | Needs More Evidence |
| `PET-2025-00002` | `9000000002` | Khadakwasla Reservoir | Water Body Encroachment | Under Review |
| `PET-2025-00003` | `9000000003` | Sanjay Gandhi Park Buffer | Unauthorized Excavation | With Officer |

---

## API Documentation

When the backend server is running, interactive OpenAPI specifications are automatically available:

- **Swagger UI**: [`http://localhost:8000/docs`](http://localhost:8000/docs)
- **ReDoc UI**: [`http://localhost:8000/redoc`](http://localhost:8000/redoc)
- **OpenAPI Schema (JSON)**: [`http://localhost:8000/openapi.json`](http://localhost:8000/openapi.json)

### Key REST Endpoints

```http
POST   /api/auth/login                  # Authenticate and obtain JWT bearer token
POST   /api/petitions                   # Submit a citizen complaint with geo-coordinates
GET    /api/petitions/track/{code}      # Track petition by code & matching mobile number
GET    /api/change-detections           # List all satellite-observed land disturbances
GET    /api/change-detections/{id}      # Get detailed change detection with GIS buffers
POST   /api/change-detections/run       # Run multi-spectral AI change detection pipeline
GET    /api/officer/cases               # List verification cases for authenticated officer
PATCH  /api/officer/cases/{id}/decision # Submit official officer determination & remarks
GET    /api/reports/{id}/pdf            # Generate and download official PDF verification dossier
```

---

## Running Automated Tests

The backend includes a comprehensive pytest suite verifying authentication, spectral change math, GIS buffers, and officer workflows:

```bash
cd backend
pytest tests/ -v
```

---

## Troubleshooting & FAQ

#### Q: The map tiles are not loading in the browser.
**A:** Ensure your system has an active internet connection to download standard OpenStreetMap tiles. In restricted or offline intranet environments, local tile server configurations can be set in `frontend/src/MapView.tsx`.

#### Q: Getting a `401 Unauthorized` or `403 Forbidden` error when reviewing cases.
**A:** Ensure you are logged in with an **Officer** (`officer@demo.com`) or **Admin** (`admin@demo.com`) account. Citizen accounts cannot access verification officer screens.

#### Q: Tracking a petition returns "Petition not found".
**A:** To protect citizen privacy and prevent unauthorized dossier scraping, tracking requires both the valid **Petition Code** (e.g. `PET-2025-00001`) and the exact **10-digit mobile number** submitted with the report.

#### Q: How do I reseed the database to the default state?
**A:** Run `python -m seed.seed` from the `backend/` directory while the virtual environment is activated.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.
