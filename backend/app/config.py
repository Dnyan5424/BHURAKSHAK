import os
SECRET=os.getenv("SECRET_KEY","dev-change-me")
DB_URL=os.getenv("DATABASE_URL","sqlite:///./bhurakshak.db")
TH={"ndvi_loss":-0.20,"bsi_up":0.15,"bsi_ndvi":-0.10,"ndbi_up":0.15,"ndwi":0.20}
MIN_PIXELS=20
DISCLAIMER="This is an AI-assisted preliminary indication. It is not a legal determination. Official verification is required."
REPORT_DISCLAIMER=("This report is an AI-assisted preliminary indication of possible land-use change. It is not a legal "
 "determination of illegality. Official verification, land records, permits, and field inspection are required.")
PLANETARY_COMPUTER_STAC="https://planetarycomputer.microsoft.com/api/stac/v1"
PUNE_BOUNDARY_URL="https://nominatim.openstreetmap.org/search"
