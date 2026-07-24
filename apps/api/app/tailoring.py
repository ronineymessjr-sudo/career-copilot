from __future__ import annotations

from .profile import get_profile
from .schemas import EvaluationResult, JobInput, PreparedPackage

RESUME_FILES = {
    "AI Agent研发版": "AI_Agent_Research.docx",
    "AI产品版": "AI_Product.docx",
    "本地过渡版": "Local_Transition.docx",
}


def select_resume(job: JobInput) -> str:
    text = f"{job.title} {job.description} {job.requirements}".lower()
    engineering = ["后端", "全栈", "开发", "python", "fastapi", "langchain", "langgraph", "rag", "agent", "mcp"]
    product = ["产品经理", "产品助理", "prd", "原型", "用户研究", "产品运营"]
    if any(k in text for k in engineering):
        return "AI Agent研发版"
    if any(k in text for k in product):
        return "AI产品版"
    return "本地过渡版"


def prepare_package(job_id: int, job: JobInput, evaluation: EvaluationResult) -> PreparedPackage:
    profile = get_profile()
    resume_version = select_resume(job)
    keywords = list(dict.fromkeys(evaluation.matched_skills + ["Python", "FastAPI", "LangGraph", "RAG"]))[:6]
    evidence = evaluation.matched_evidence[:3] or profile.evidence[:3]
    evidence_summary = [f"{item.project}：{item.evidence}" for item in evidence]

    project_names = list(dict.fromkeys(item.project for item in evidence))
    projects = "、".join(project_names[:2]) or "Camera Market Strategy System 与 LangGraph/RAG 项目"
    greeting = (
        f"您好，我是 2028 届人工智能本科生，看到贵司的“{job.title}”实习岗位。"
        f"我具备 { '、'.join(keywords[:4]) } 的项目实践，相关证据来自 {projects}。"
        f"岗位中提到的 { '、'.join(evaluation.matched_skills[:3]) or 'AI 应用落地' } 与我的方向较匹配。"
        "我可稳定实习每周至少 3 天、持续至少 3 个月，想进一步了解团队当前的核心项目和实习生交付边界。"
    )

    email_subject = None
    email_body = None
    if job.channel == "email":
        email_subject = f"应聘 {job.title} 实习生｜2028届人工智能本科生"
        email_body = greeting + "\n\n项目证据：\n- " + "\n- ".join(evidence_summary)

    notes: list[str] = []
    if evaluation.needs_confirmation:
        notes.extend(evaluation.confirmation_questions)
    truth_passed = bool(evidence_summary) and job.is_internship
    if not truth_passed:
        notes.append("缺少足够项目证据或岗位并非明确实习")

    return PreparedPackage(
        job_id=job_id,
        resume_version=resume_version,
        resume_filename=RESUME_FILES[resume_version],
        highlighted_keywords=keywords,
        greeting=greeting,
        email_subject=email_subject,
        email_body=email_body,
        evidence_summary=evidence_summary,
        truth_check_passed=truth_passed,
        truth_check_notes=notes,
    )
