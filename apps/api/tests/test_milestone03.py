from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
from pathlib import Path

import httpx

from app.integrations.supabase_rest import SupabaseRestClient
from app.supabase_sync import sync_local_to_supabase


def _rmtree_force(repo: Path) -> None:
    def _onerror(func, path, exc_info):
        os.chmod(path, stat.S_IWRITE)
        func(path)

    shutil.rmtree(repo, onerror=_onerror)


def test_supabase_client_injects_user_ownership_and_auth_headers():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["headers"] = dict(request.headers)
        captured["payload"] = json.loads(request.content)
        captured["url"] = str(request.url)
        return httpx.Response(201, json=[{"id": "remote-1", "source_id": "source-1"}])

    client = SupabaseRestClient(
        base_url="https://example.supabase.co",
        api_key="project-api-key",
        access_token="signed-user-token",
        user_id="00000000-0000-0000-0000-000000000001",
        transport=httpx.MockTransport(handler),
    )
    rows = client.upsert(
        "jobs",
        [{"source_id": "source-1", "title": "AI 实习"}],
        on_conflict="user_id,source_id",
        return_rows=True,
    )
    assert rows[0]["id"] == "remote-1"
    assert captured["payload"][0]["user_id"].endswith("0001")
    assert captured["headers"]["apikey"] == "project-api-key"
    assert captured["headers"]["authorization"] == "Bearer signed-user-token"
    assert "on_conflict=user_id%2Csource_id" in captured["url"]


def test_mock_benchmark_is_marked_non_comparable(client):
    response = client.post(
        "/api/model/benchmarks",
        headers={"X-Admin-Token": "test-admin"},
        json={"suite_name": "m03-test", "max_cases": 2},
    )
    assert response.status_code == 200
    result = response.json()
    assert result["is_demo"] is True
    assert result["comparable"] is False
    assert result["semantic_pass_rate"] is None
    stored = client.get("/api/model/benchmarks").json()
    assert stored[0]["suite_name"] == "m03-test"


def test_git_evidence_collects_diff_without_ai_attribution(client):
    project_root = Path(__file__).resolve().parents[2]
    repo = project_root / "apps" / "api" / "data" / "test_git_evidence_repo"
    if repo.exists():
        _rmtree_force(repo)
    repo.mkdir(parents=True)
    subprocess.run(["git", "init"], cwd=repo, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=repo, check=True)
    (repo / "demo.py").write_text("print('v1')\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-m", "first"], cwd=repo, check=True, capture_output=True)
    base = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
    (repo / "demo.py").write_text("print('v2')\nprint('evidence')\n", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-m", "second"], cwd=repo, check=True, capture_output=True)

    junit = repo / "junit.xml"
    junit.write_text('<testsuite tests="3" failures="1" errors="0" skipped="0"></testsuite>', encoding="utf-8")
    relative = repo.relative_to(project_root)
    response = client.post(
        "/api/engineering/git-evidence",
        headers={"X-Admin-Token": "test-admin"},
        json={
            "repo_path": str(relative),
            "base_ref": base,
            "head_ref": "HEAD",
            "junit_path": "junit.xml",
            "ci_run_url": "https://github.example/actions/runs/1",
        },
    )
    try:
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["files_changed"] == 1
        assert data["insertions"] >= 1
        assert data["tests_run"] == 3
        assert data["tests_passed"] == 2
        assert data["attribution"] == "unknown"
        summary = client.get("/api/engineering/summary").json()["delivery"]
        assert summary["automated_runs"] == 1
        assert summary["git_insertions"] >= 1
    finally:
        _rmtree_force(repo)


def test_full_local_state_can_map_to_supabase_data_api(client):
    seed_path = Path(__file__).resolve().parents[1] / "data" / "seed_jobs.json"
    payload = json.loads(seed_path.read_text(encoding="utf-8"))[:1]
    job_id = client.post("/api/jobs/import", json=payload).json()["job_ids"][0]
    client.post(f"/api/jobs/{job_id}/evaluate")
    package_id = client.post(f"/api/jobs/{job_id}/prepare").json()["package_id"]
    client.post(
        f"/api/approvals/{package_id}/decision",
        headers={"X-Admin-Token": "test-admin"},
        json={"decision": "approve"},
    )

    seen_tables = []

    def handler(request: httpx.Request) -> httpx.Response:
        table = request.url.path.rsplit("/", 1)[-1]
        seen_tables.append(table)
        payload_rows = json.loads(request.content)
        if table == "jobs":
            return httpx.Response(201, json=[{"id": "remote-job-1", "source_id": payload_rows[0]["source_id"]}])
        return httpx.Response(201)

    supabase = SupabaseRestClient(
        base_url="https://example.supabase.co",
        api_key="secret",
        user_id="00000000-0000-0000-0000-000000000001",
        transport=httpx.MockTransport(handler),
    )
    result = sync_local_to_supabase(supabase)
    assert result["jobs"] == 1
    assert result["evaluations"] == 1
    assert result["packages"] == 1
    assert result["applications"] == 1
    assert {"jobs", "job_evaluations", "application_packages", "applications"}.issubset(seen_tables)
