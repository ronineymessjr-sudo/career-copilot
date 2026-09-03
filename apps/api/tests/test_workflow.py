import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


def seed_one(client):
    path = Path(__file__).resolve().parents[1] / "data" / "seed_jobs.json"
    payload = json.loads(path.read_text(encoding="utf-8"))[:1]
    response = client.post("/api/jobs/import", json=payload)
    assert response.status_code == 200
    return response.json()["job_ids"][0]


def test_evaluate_prepare_and_approve_platform_job(client):
    job_id = seed_one(client)
    evaluation = client.post(f"/api/jobs/{job_id}/evaluate")
    assert evaluation.status_code == 200
    package = client.post(f"/api/jobs/{job_id}/prepare")
    assert package.status_code == 200
    package_id = package.json()["package_id"]
    decision = client.post(f"/api/approvals/{package_id}/decision", json={"decision":"approve"})
    assert decision.status_code == 200
    applications = client.get("/api/applications").json()
    assert len(applications) == 1
    assert applications[0]["status"] == "prepared"
    assert applications[0]["submitted_at"] is None
    assert "尚未提交" in applications[0]["note"]


def test_dashboard_and_daily_report(client):
    job_id = seed_one(client)
    client.post(f"/api/jobs/{job_id}/evaluate")
    dashboard = client.get("/api/dashboard")
    assert dashboard.status_code == 200
    assert dashboard.json()["metrics"]["total_jobs"] == 1
    report = client.get("/api/daily-report")
    assert report.status_code == 200
    assert "top_recommendations" in report.json()
    payload = report.json()
    now = datetime.now(ZoneInfo("Asia/Shanghai"))
    assert payload["date"] == now.date().isoformat()
    assert payload["timezone"] == "Asia/Shanghai"
    assert datetime.fromisoformat(payload["generated_at"]).tzinfo is not None
