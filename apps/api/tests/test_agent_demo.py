def test_agent_analyze_job_recommends_grounded_ai_internship(client):
    response = client.post("/agent/analyze-job", json={
        "jd_text": "AI Agent实习生，接受2028届在校生。使用Python、FastAPI、LangGraph、RAG、MCP和Docker，每周至少3天，至少3个月，上海或远程。",
        "company": "Demo AI",
        "title": "AI Agent实习生",
        "city": "上海",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["grade"] in {"S", "A"}
    assert data["automatic_submission"] is False
    assert "LangGraph" in data["matched_skills"]
    assert "career-copilot" in data["citations"]


def test_agent_analyze_job_blocks_full_time_role(client):
    response = client.post("/agent/analyze-job", json={"jd_text": "2027届提前批全职岗位，仅毕业生可投，要求Python开发。"})
    assert response.status_code == 200
    data = response.json()
    assert data["score"] <= 49
    assert data["grade"] == "C"
    assert data["blockers"]


def test_agent_generate_resume_is_draft_only(client):
    response = client.post("/agent/generate-resume", json={
        "jd_text": "AI产品实习生，在校生可投，负责PRD、Figma、数据分析和Agent产品流程。",
        "persona": "ai_product",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["persona_label"] == "AI产品版"
    assert data["status"] == "draft"
    assert data["automatic_send"] is False
    assert data["automatic_submission"] is False


def test_agent_evaluation_detects_unsupported_citation(client):
    response = client.post("/agent/evaluate", json={
        "output": "基于Career Copilot项目证据，推荐该岗位并保留人工确认。",
        "citations": ["career-copilot", "invented"],
        "expected_citations": ["career-copilot"],
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "failed"
    assert data["metrics"]["unsupported_claim_count"] == 1
