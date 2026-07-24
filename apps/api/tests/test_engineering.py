from datetime import datetime, timedelta, timezone


def test_mock_model_gateway_records_metrics(client):
    health = client.get("/api/model/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"
    assert health.json()["provider"] == "mock"

    response = client.post(
        "/api/model/generate",
        headers={"X-Admin-Token": "test-admin"},
        json={"prompt": "生成一个岗位匹配摘要", "temperature": 0.1, "max_tokens": 128},
    )
    assert response.status_code == 200
    assert response.json()["provider"] == "mock"
    assert "岗位匹配摘要" in response.json()["text"]

    metrics = client.get("/api/model/metrics").json()["summary"]
    assert metrics["total_runs"] == 1
    assert metrics["successful_runs"] == 1
    assert metrics["success_rate"] == 100.0


def test_delivery_run_summary_tracks_human_review_and_quality(client):
    start = datetime(2026, 7, 23, 9, 0, tzinfo=timezone.utc)
    finish = start + timedelta(minutes=120)
    response = client.post(
        "/api/engineering/delivery-runs",
        headers={"X-Admin-Token": "test-admin"},
        json={
            "project": "Career Copilot V2",
            "task_name": "模型网关与工程证据页",
            "agent_tool": "ChatGPT + Codex",
            "started_at": start.isoformat(),
            "finished_at": finish.isoformat(),
            "files_changed": 8,
            "ai_generated_lines": 520,
            "human_edited_lines": 180,
            "tests_run": 6,
            "tests_passed": 6,
            "acceptance_criteria_total": 5,
            "acceptance_criteria_met": 5,
            "notes": "测试记录，不代表外部生产部署。",
            "source_ref": "milestone-02",
        },
    )
    assert response.status_code == 200
    summary = response.json()["summary"]
    assert summary["total_runs"] == 1
    assert summary["total_hours"] == 2.0
    assert summary["test_pass_rate"] == 100.0
    assert summary["acceptance_rate"] == 100.0
    assert summary["human_edit_share"] == 25.7

    combined = client.get("/api/engineering/summary")
    assert combined.status_code == 200
    assert combined.json()["delivery"]["files_changed"] == 8
