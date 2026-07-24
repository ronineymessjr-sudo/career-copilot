from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps" / "api"
sys.path.insert(0, str(API))
os.environ["CAREER_COPILOT_DB"] = str(API / "data" / "smoke.db")

from fastapi.testclient import TestClient
from app.main import app


def main() -> None:
    db = API / "data" / "smoke.db"
    if db.exists(): db.unlink()
    jobs = json.loads((API / "data" / "seed_jobs.json").read_text(encoding="utf-8"))
    with TestClient(app) as client:
        imported = client.post("/api/jobs/import", json=jobs).json()
        for job_id in imported["job_ids"]:
            client.post(f"/api/jobs/{job_id}/evaluate")
        for row in client.get("/api/jobs").json():
            evaluation = row.get("evaluation") or {}
            if evaluation.get("eligible") and evaluation.get("grade") in {"S","A"}:
                client.post(f"/api/jobs/{row['id']}/prepare")
        output = {
            "health": client.get("/health").json(),
            "dashboard": client.get("/api/dashboard").json(),
            "jobs": len(client.get("/api/jobs").json()),
            "pending_approvals": len(client.get("/api/approvals").json()),
            "daily_report_keys": list(client.get("/api/daily-report").json().keys()),
        }
    (ROOT / "SMOKE_RESULT.json").write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(output, ensure_ascii=False, indent=2))

if __name__ == "__main__": main()
