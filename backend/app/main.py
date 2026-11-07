import asyncio
import logging
from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import requests
from .database import B,E,migrate_schema
from .models import *
from .utils.helpers import BASE
from .routers import auth,petitions,detections,officer,portals,reports,admin,satellite
B.metadata.create_all(E)
migrate_schema()
app=FastAPI(title="BhuRakshak API",description="AI-assisted land-use change detection. Not a legal determination.")
logger = logging.getLogger("bhurakshak.automatic_review")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])
for r in (auth,petitions,detections,officer,portals,reports,admin,satellite):app.include_router(r.router)

async def _automatic_review_loop():
    from .database import S
    from .models import AutomaticFetchConfig
    from .services.automatic_review import run_scheduled_review
    # Let the API accept the first login before any scheduled work starts.
    await asyncio.sleep(30)
    while True:
        session = S()
        try:
            config = session.query(AutomaticFetchConfig).first()
            if config is None:
                config = AutomaticFetchConfig(last_run_at=datetime.utcnow())
                session.add(config)
                session.commit()
            now_ist = datetime.now(ZoneInfo("Asia/Kolkata"))
            if config is not None and config.last_run_at is None:
                config.last_run_at = datetime.utcnow()
                session.commit()
            due = config is not None and config.enabled and now_ist.hour >= 6 and config.last_run_at is not None and (
                datetime.utcnow() - config.last_run_at
            ).total_seconds() >= config.frequency_minutes * 60
        finally:
            session.close()
        if due:
            try:
                await asyncio.to_thread(run_scheduled_review)
            except (OSError, requests.RequestException, ValueError, KeyError, RuntimeError):
                logger.exception("Automatic satellite review failed")
        await asyncio.sleep(60)

@app.on_event("startup")
def load_bundled_monitoring_grids():
    from .database import S
    from .services.geographic import seed_bundled_monitoring_grids

    dataset_path = os.path.join(BASE, "data", "aoi", "pmc_pcmc_grid_seed.geojson")
    if not os.path.exists(dataset_path):
        return
    session = S()
    try:
        seed_bundled_monitoring_grids(session, dataset_path)
    finally:
        session.close()

@app.on_event("startup")
def recover_interrupted_grid_jobs():
    from datetime import datetime
    from .database import S
    from .models import MonitoringGrid, MonitoringJob

    session = S()
    try:
        active = session.query(MonitoringJob).filter(MonitoringJob.status.in_(
            ["queued", "searching", "downloading", "detecting"]
        )).all()
        for job in active:
            job.status = "failed"
            job.message = "Analysis was interrupted by a backend restart. Retry this grid to continue."
            job.completed_at = datetime.utcnow()
            grid = session.get(MonitoringGrid, job.grid_id)
            if grid and grid.last_job_id == job.id:
                grid.status = "Failed"
        if active:
            session.commit()
    finally:
        session.close()

@app.on_event("startup")
async def start_automatic_review():
    app.state.automatic_review_task = asyncio.create_task(_automatic_review_loop())

@app.on_event("shutdown")
async def stop_automatic_review():
    task = getattr(app.state, "automatic_review_task", None)
    if task:
        task.cancel()

app.mount("/",StaticFiles(directory=os.path.join(BASE,"static"),html=True))
