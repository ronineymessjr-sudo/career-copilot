from app.profile import get_profile
from app.schemas import JobInput
from app.scoring import evaluate_job


def test_remote_small_agent_job_scores_high():
    job = JobInput(
        source_id="test-remote",
        company="Remote AI",
        title="AI Agent Python 后端实习生",
        description="使用 FastAPI、LangGraph、RAG 和 Docker 完成 Agent 服务。",
        requirements="Python SQL Tool Calling",
        city="远程",
        workplace="remote",
        company_tier="small",
        accepts_students=True,
        accepts_2028=True,
        days_per_week=3,
        minimum_months=3,
        source_reliability=5,
    )
    result = evaluate_job(job, get_profile())
    assert result.eligible is True
    assert result.segment == "远程优先"
    assert result.grade in {"S", "A"}
    assert "python" in result.matched_skills
    assert result.matched_evidence


def test_full_time_job_is_rejected():
    job = JobInput(
        source_id="test-fulltime",
        company="Example",
        title="AI 工程师",
        description="正式岗位",
        is_internship=False,
        accepts_students=False,
        accepts_2028=False,
        days_per_week=5,
        minimum_months=12,
    )
    result = evaluate_job(job, get_profile())
    assert result.eligible is False
    assert result.total_score <= 59
