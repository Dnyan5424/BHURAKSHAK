"""End-to-End Test Suite for BhuRakshak simplified MVP workflows."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_header(email: str, password: str) -> dict:
    """Helper to authenticate and generate JWT Authorization Bearer header."""
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}

def test_citizen_submit_and_track_flow():
    """Validates citizen complaint filing (<2 min) and status tracking via mobile."""
    # 1. Citizen submits a new report
    payload = {
        "latitude": 18.5525,
        "longitude": 73.8550,
        "category": "Tree Cutting & Forest Loss",
        "description": "Automated test complaint: unauthorized clearing near road boundary.",
        "village_city": "Mulshi",
        "district": "Pune",
        "mobile": "9123456789",
        "consent_given": True,
    }
    submit_res = client.post("/api/petitions", json=payload)
    assert submit_res.status_code == 200 or submit_res.status_code == 201
    data = submit_res.json()
    petition_code = data.get("petition_code")
    assert petition_code is not None
    assert "PET-" in petition_code

    # 2. Track with correct mobile number -> Must succeed (200 OK)
    track_res = client.get(f"/api/petitions/track/{petition_code}?mobile=9123456789")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["petition_code"] == petition_code
    assert track_data["status"] in ["Submitted", "Under Review", "With Officer"]

    # 3. Track with WRONG mobile number -> Privacy guard must block (404 Not Found)
    bad_track_res = client.get(f"/api/petitions/track/{petition_code}?mobile=9000000000")
    assert bad_track_res.status_code == 404

def test_officer_review_and_decision_flow():
    """Validates officer case list, case review, decision recording, and RBAC."""
    officer_headers = get_auth_header("officer@demo.com", "Officer@123")
    citizen_headers = get_auth_header("citizen@demo.com", "Citizen@123")

    # 1. Citizen cannot view officer cases (403 Forbidden)
    forbidden_res = client.get("/api/officer/cases", headers=citizen_headers)
    assert forbidden_res.status_code == 403

    # 2. Officer can view cases (200 OK)
    cases_res = client.get("/api/officer/cases", headers=officer_headers)
    assert cases_res.status_code == 200
    cases = cases_res.json()
    assert isinstance(cases, list)
    assert len(cases) > 0

    first_case = cases[0]
    case_id = first_case.get("case_id") or first_case.get("id")

    # 3. Officer records a valid decision
    decision_payload = {
        "decision": "Needs More Evidence",
        "remarks": "Automated verification test: field inspection scheduled for tomorrow.",
    }
    decision_res = client.patch(
        f"/api/officer/cases/{case_id}/decision",
        json=decision_payload,
        headers=officer_headers,
    )
    assert decision_res.status_code == 200

def test_admin_satellite_run_flow():
    """Validates satellite change detection catalog and admin execution permissions."""
    admin_headers = get_auth_header("admin@demo.com", "Admin@123")
    citizen_headers = get_auth_header("citizen@demo.com", "Citizen@123")

    # 1. Public can view existing detections
    dets_res = client.get("/api/change-detections")
    assert dets_res.status_code == 200
    detections = dets_res.json()
    assert len(detections) >= 1

    # 2. Citizen cannot upload raster scenes (403 Forbidden)
    upload_attempt = client.post(
        "/api/scenes/upload",
        headers=citizen_headers,
        data={"study_area_name": "Test Area", "image_type": "before", "scene_date": "2025-01-01"},
    )
    assert upload_attempt.status_code == 403

    # 3. Admin can list scenes
    scenes_res = client.get("/api/scenes", headers=admin_headers)
    assert scenes_res.status_code == 200
    scenes = scenes_res.json()
    assert len(scenes) >= 2
