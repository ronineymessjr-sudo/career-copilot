from __future__ import annotations

import re
from datetime import date

from .schemas import CandidateProfile, EvaluationResult, JobInput

SKILL_ALIASES = {
    "python": ["python"],
    "fastapi": ["fastapi"],
    "langchain": ["langchain"],
    "langgraph": ["langgraph"],
    "rag": ["rag", "检索增强", "知识库"],
    "docker": ["docker", "容器"],
    "sql": ["sql", "postgresql", "mysql", "数据库"],
    "figma": ["figma", "原型"],
    "prd": ["prd", "需求文档", "需求分析"],
    "prompt": ["prompt", "提示词"],
    "function calling": ["function calling", "tool calling", "工具调用"],
    "mcp": ["mcp", "model context protocol"],
    "next.js": ["next.js", "nextjs"],
    "react": ["react"],
    "typescript": ["typescript", "ts"],
    "javascript": ["javascript", "js"],
    "supabase": ["supabase"],
    "cloudflare": ["cloudflare", "workers"],
    "redis": ["redis"],
    "evaluation": ["evaluation", "评测", "评估"],
}

ROLE_KEYWORDS = [
    "agent", "智能体", "大模型", "llm", "rag", "prompt", "人工智能", "ai产品",
    "产品助理", "解决方案", "ai运营", "增长", "python", "fastapi", "数据分析",
    "软件实施", "全栈", "ai native", "mcp",
]


def _text(job: JobInput) -> str:
    return " ".join([job.title, job.description, job.requirements, " ".join(job.tags)]).lower()


def _mentioned_skills(job: JobInput) -> list[str]:
    text = _text(job)
    found: list[str] = []
    for canonical, aliases in SKILL_ALIASES.items():
        if any(re.search(rf"(?<![a-z0-9]){re.escape(alias.lower())}(?![a-z0-9])", text) for alias in aliases):
            found.append(canonical)
    return found


def _profile_skill_set(profile: CandidateProfile) -> set[str]:
    values: set[str] = set()
    for item in profile.skills:
        lower = item.lower()
        values.add(lower)
        for canonical, aliases in SKILL_ALIASES.items():
            if lower == canonical or any(alias in lower for alias in aliases):
                values.add(canonical)
    return values


def _segment(job: JobInput) -> str:
    if job.workplace == "remote":
        return "远程优先"
    if "崇川" in job.district:
        return "南通崇川"
    if "建邺" in job.district or "建业" in job.district or "浦口" in job.district:
        return "南京建邺/浦口"
    if any(city in job.city for city in ["上海", "苏州", "杭州"]):
        return "上海/苏州/杭州"
    if job.company_tier == "medium":
        return "中厂补充"
    if job.company_tier == "large":
        return "大厂冲刺"
    return "其他补充"


def _location_score(job: JobInput) -> int:
    return {
        "远程优先": 15,
        "南通崇川": 14,
        "南京建邺/浦口": 13,
        "上海/苏州/杭州": 10,
        "中厂补充": 7,
        "大厂冲刺": 4,
        "其他补充": 3,
    }[_segment(job)]


def _company_score(job: JobInput) -> int:
    return {"small": 10, "medium": 7, "large": 3, "unknown": 5}[job.company_tier]


def _grade(score: int) -> str:
    if score >= 85:
        return "S"
    if score >= 75:
        return "A"
    if score >= 65:
        return "B"
    return "C"


def _jd_tasks(job: JobInput) -> list[str]:
    text = _text(job)
    tasks: list[str] = []
    mapping = [
        (["agent", "智能体", "langgraph"], "搭建或迭代 Agent 工作流、状态与工具调用"),
        (["rag", "知识库", "检索增强"], "处理文档、检索、召回、引用与 RAG 效果优化"),
        (["fastapi", "后端", "接口", "api"], "开发业务 API、模型接口与服务端功能"),
        (["next.js", "react", "前端", "全栈"], "实现 AI 产品前端、数据展示与交互闭环"),
        (["prd", "产品", "需求", "原型"], "进行需求拆解、PRD、原型和跨团队推进"),
        (["实施", "交付", "客户"], "参与客户需求澄清、方案实施与结果交付"),
        (["运营", "增长", "内容"], "跟踪内容或用户数据并推动增长实验"),
    ]
    for keys, task in mapping:
        if any(k in text for k in keys):
            tasks.append(task)
    return tasks[:5] or ["岗位职责描述不足，需向 HR 确认日常任务和交付物"]


def evaluate_job(job: JobInput, profile: CandidateProfile, today: date | None = None) -> EvaluationResult:
    today = today or date.today()
    reasons: list[str] = []
    questions: list[str] = []
    eligible = True
    needs_confirmation = False

    if not job.is_internship:
        eligible = False
        reasons.append("不是在校实习岗位")
    if job.status.lower() not in {"open", "active", "unknown"}:
        eligible = False
        reasons.append("岗位当前不是开放状态")
    if job.accepts_students is False:
        eligible = False
        reasons.append("明确不接受在校生")
    elif job.accepts_students is None:
        needs_confirmation = True
        questions.append("是否接受在校生？")
    if job.accepts_2028 is False:
        eligible = False
        reasons.append("明确不接受 2028 届")
    elif job.accepts_2028 is None:
        needs_confirmation = True
        questions.append("是否接受 2028 届？")
    if job.days_per_week is not None and job.days_per_week < 3:
        eligible = False
        reasons.append("每周出勤少于 3 天")
    elif job.days_per_week is None:
        needs_confirmation = True
        questions.append("每周最低出勤天数是多少？")
    if job.minimum_months is not None and job.minimum_months < 3:
        eligible = False
        reasons.append("最短实习周期少于 3 个月")
    elif job.minimum_months is None:
        needs_confirmation = True
        questions.append("最短实习周期是多少？")
    if job.deadline and job.deadline < today:
        eligible = False
        reasons.append("投递已截止")

    text = _text(job)
    role_hits = sum(1 for keyword in ROLE_KEYWORDS if keyword in text)
    role_score = min(25, 6 + role_hits * 3)

    job_skills = _mentioned_skills(job)
    profile_skills = _profile_skill_set(profile)
    matched = sorted(skill for skill in job_skills if skill in profile_skills)
    missing = sorted(skill for skill in job_skills if skill not in profile_skills)
    skill_score = 12 if not job_skills else min(25, round(25 * len(matched) / max(1, len(job_skills))))

    location_score = _location_score(job)
    schedule_score = 10 if (job.days_per_week or 0) >= 3 and (job.minimum_months or 0) >= 3 else 5
    company_score = _company_score(job)

    evidence = []
    seen = set()
    for item in profile.evidence:
        normalized = item.skill.lower()
        if any(skill in normalized or normalized in skill for skill in matched):
            key = (item.skill, item.project)
            if key not in seen:
                evidence.append(item)
                seen.add(key)
    evidence = evidence[:6]
    evidence_score = min(10, 2 + len(evidence) * 2)
    source_score = job.source_reliability

    total = max(0, min(100, role_score + skill_score + location_score + schedule_score + company_score + evidence_score + source_score))
    if not eligible:
        total = min(total, 59)

    if any(x in text for x in ["快速", "独立", "从0到1", "mvp", "落地", "交付"]):
        preference = "基于 JD 的推断：团队更重工程落地、快速交付和独立解决问题。"
    elif any(x in text for x in ["prd", "需求", "用户", "原型", "产品"]):
        preference = "基于 JD 的推断：团队更重产品思维、需求拆解和跨团队沟通。"
    elif any(x in text for x in ["客户", "实施", "解决方案"]):
        preference = "基于 JD 的推断：团队更重客户沟通、方案实施和结果交付。"
    else:
        preference = "基于 JD 的推断：偏好信息不足，需要向 HR 确认实际工作重心。"

    risks: list[str] = []
    if missing:
        risks.append("技术缺口：" + "、".join(missing[:5]))
    if needs_confirmation:
        risks.append("届别、出勤或周期信息不完整，不能直接自动投递")
    if job.company_tier == "small":
        risks.append("小团队可能要求完整交付，需要确认导师、代码评审和任务边界")

    return EvaluationResult(
        eligible=eligible,
        needs_confirmation=needs_confirmation,
        hard_filter_reasons=reasons,
        confirmation_questions=questions,
        role_score=role_score,
        skill_score=skill_score,
        location_score=location_score,
        schedule_score=schedule_score,
        company_score=company_score,
        evidence_score=evidence_score,
        source_score=source_score,
        total_score=total,
        grade=_grade(total),
        segment=_segment(job),
        matched_skills=matched,
        missing_skills=missing,
        matched_evidence=evidence,
        inferred_hr_preference=preference,
        interview_risks=risks,
        jd_tasks=_jd_tasks(job),
    )
