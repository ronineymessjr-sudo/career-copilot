from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / "apps" / "api" / "data" / "smoke_m03.db"
os.environ["CAREER_COPILOT_DB"] = str(DB)
os.environ["CAREER_COPILOT_ADMIN_TOKEN"] = "smoke-admin"
os.environ["MODEL_PROVIDER"] = "mock"
os.environ["DATA_BACKEND"] = "sqlite"

import sys
sys.path.insert(0, str(ROOT / "apps" / "api"))

from fastapi.testclient import TestClient
from app.main import app


def run() -> dict:
    if DB.exists():
        DB.unlink()
    git_repo = ROOT / "apps" / "api" / "data" / "smoke_git_repo"
    shutil.rmtree(git_repo, ignore_errors=True)
    git_repo.mkdir(parents=True)
    subprocess.run(["git", "init"], cwd=git_repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "smoke@example.com"], cwd=git_repo, check=True)
    subprocess.run(["git", "config", "user.name", "Smoke Test"], cwd=git_repo, check=True)
    (git_repo / "feature.py").write_text("def value():\n    return 1\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=git_repo, check=True)
    subprocess.run(["git", "commit", "-m", "base"], cwd=git_repo, check=True, capture_output=True)
    base = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=git_repo, text=True).strip()
    (git_repo / "feature.py").write_text("def value():\n    return 2\n\ndef verified():\n    return True\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=git_repo, check=True)
    subprocess.run(["git", "commit", "-m", "feature"], cwd=git_repo, check=True, capture_output=True)
    (git_repo / "junit.xml").write_text('<testsuite tests="4" failures="0" errors="0" skipped="0"></testsuite>', encoding="utf-8")

    headers = {"X-Admin-Token": "smoke-admin"}
    with TestClient(app) as client:
        health = client.get("/health").json()
        supabase = client.get("/api/supabase/health").json()
        benchmark = client.post(
            "/api/model/benchmarks",
            headers=headers,
            json={"suite_name": "milestone-03-smoke", "max_cases": 4},
        ).json()
        relative_repo = git_repo.relative_to(ROOT)
        git_evidence = client.post(
            "/api/engineering/git-evidence",
            headers=headers,
            json={
                "repo_path": str(relative_repo),
                "base_ref": base,
                "head_ref": "HEAD",
                "junit_path": "junit.xml",
                "ci_run_url": "local://smoke",
                "task_name": "Milestone 03 smoke evidence",
            },
        ).json()
        engineering = client.get("/api/engineering/summary").json()
        denied = client.post(
            "/api/model/benchmarks",
            json={"suite_name": "should-be-denied", "max_cases": 1},
        )

    result = {
        "version": health["version"],
        "data_backend": health["data_backend"],
        "supabase": supabase,
        "benchmark": {
            "provider": benchmark["provider"],
            "is_demo": benchmark["is_demo"],
            "comparable": benchmark["comparable"],
            "cases_total": benchmark["cases_total"],
            "cases_succeeded": benchmark["cases_succeeded"],
            "semantic_pass_rate": benchmark["semantic_pass_rate"],
        },
        "git_evidence": {
            "files_changed": git_evidence["files_changed"],
            "insertions": git_evidence["insertions"],
            "deletions": git_evidence["deletions"],
            "tests_run": git_evidence["tests_run"],
            "tests_passed": git_evidence["tests_passed"],
            "attribution": git_evidence["attribution"],
        },
        "engineering_summary": engineering,
        "admin_guard_status_without_token": denied.status_code,
        "external_model_request": engineering["model_health"]["external_request"],
    }
    return result


if __name__ == "__main__":
    result = run()
    output = ROOT / "SMOKE_RESULT_M03.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    shutil.rmtree(ROOT / "apps" / "api" / "data" / "smoke_git_repo", ignore_errors=True)
    if DB.exists():
        DB.unlink()
