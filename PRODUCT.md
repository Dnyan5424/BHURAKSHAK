# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Citizens submit land-use concerns and track petition status.
- Officers review evidence and record official case decisions.
- Administrators manage cases and the available monitoring workflow.

## Product Purpose

BhuRakshak connects citizen petitions with preliminary land-use change indicators and officer review. Success means that users can submit or inspect a case, understand the evidence and its limits, and follow the appropriate hand-off without mistaking an automated signal for an official decision.

## Positioning

The workflow brings together citizen-reported concerns, satellite/GIS context, and authorized officer verification in one case-review application.

## Operating Context

The project is a locally run demonstration web application with a React/Vite frontend and FastAPI backend. Synthetic demonstration data is available for presentations and local testing.

## Capabilities and Constraints

- Citizens can submit and track petitions; officers review cases and record decisions; administrators manage case and monitoring workflows.
- Satellite and GIS analysis produces preliminary indicators only. It does not establish a violation or make a legal determination.
- Included demo imagery and GIS layers are synthetic. Provider names are metadata; live Copernicus, NASA, and USGS catalog retrieval is not configured.
- Raster comparisons require compatible, aligned inputs.
- The default local database is SQLite. The demo seed command recreates database tables and must not run against data that needs to be retained.

## Evidence on Hand

- Synthetic demo scenes and GIS layers: `backend/data/raw/`.
- Example processed raster outputs: `backend/data/processed/`.
- Demo seed and account setup: `backend/seed/seed.py`.
- Workflow, data, and operating constraints: `docs/WORKFLOW_AND_DATA_GUIDE.md`.
- The repository does not provide live satellite catalog integration or production data evidence.

## Product Principles

- Separate automated indicators from verified findings and official decisions.
- Preserve evidence provenance and geographic context during case review.
- Make the citizen-to-officer hand-off understandable and traceable.
- Clearly identify synthetic demo data and limitations.
