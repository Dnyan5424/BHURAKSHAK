# BhuRakshak

BhuRakshak connects citizen petitions with preliminary land-use change indicators and officer review. Automated analysis flags possible changes; it does not make legal determinations.

## Run locally on Windows

Install Python and Node.js, open PowerShell in this folder, then run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1
```

On first run, the script creates a Python virtual environment, installs dependencies, installs frontend packages when needed, and seeds synthetic demo data only when the default local database does not yet exist. It then opens the API and frontend in separate PowerShell windows. Close both windows to stop the app.

- App: <http://localhost:5173>
- API: <http://localhost:8000>
- Interactive API docs: <http://localhost:8000/docs>

The default local database is `backend/bhurakshak.db`. The launcher never reseeds an existing database. To preserve data, do not run `python -m seed.seed`: that command drops and recreates database tables. Back up the database before any intentional reset.

## Demo access

Use **Sign in** and choose a demo role to fill the synthetic account credentials:

| Role | Email | Password |
| --- | --- | --- |
| Citizen | `citizen@demo.com` | `Citizen@123` |
| Officer | `officer@demo.com` | `Officer@123` |
| Administrator | `admin@demo.com` | `Admin@123` |

Example petition to track: `PET-2025-00001` with mobile `9000000001`.

## Data and limitations

Included demo imagery and GIS layers are synthetic. Provider names are metadata only; live Copernicus, NASA, or USGS catalog retrieval is not configured. Raster comparisons require compatible, aligned inputs. AI-assisted results are preliminary and must be reviewed by an authorized officer.

For workflows, permissions, storage, and input constraints, see the [workflow and data guide](./docs/WORKFLOW_AND_DATA_GUIDE.md).
