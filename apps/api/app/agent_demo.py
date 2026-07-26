from __future__ import annotations

import re
from typing import Any

from .schemas import AgentEvaluateInput, AgentJobAnalyzeInput, AgentResumeInput

SKILLS = {
    "Python": ["python"],
    "FastAPI": ["fastapi"],
    "LangGraph": ["langgraph"],
    "LangChain": ["langchain"],
    "RAG": ["rag", "检索增强", "知识库"],
    "MCP": ["mcp", "model context protocol"],
    "Docker": ["docker", "容器"],
    "SQL": ["sql", "postgresql", "postgres", "supabase"],
    "Next.js": ["next.js", "nextjs"],
    "React": ["react"],
    "Figma": ["figma"],
    "PRD": ["prd", "需求文档"],
    "Prompt": ["prompt"],
    "Function Calling": ["function calling", "tool calling", "工具调用"],
    "Evaluation": ["evaluation", "评测", "评估"],
}

PORTFOLIO = {
    "Career Copilot": {"skills": {"Python", "FastAPI", "LangGraph", "RAG", "MCP", "Docker", "SQL", "Next.js", "React", "Evaluation"}, "citation": "career-copilot"},
    "Camera Market Strategy System": {"skills": {"Python", "SQL"}, "citation": "camera-market"},
    "PhotoAtelier": {"skills": {"Next.js", "React", "Figma", "PRD"}, "citation": "photoatelier"},
}

PERSONAS = {
    "agent_engineer": {"label": "AI Agent研发版", "order": ["Career Copilot", "Camera Market Strategy System", "PhotoAtelier"]},
    "ai_product": {"label": "AI产品版", "order": ["PhotoAtelier", "Career Copilot", "Camera Market Strategy System"]},
    "ai_solution": {"label": "AI解决方案版", "order": ["Career Copilot", "PhotoAtelier", "Camera Market Strategy System"]},
    "local_transition": {"label": "本地过渡版", "order": ["Camera Market Strategy System", "Career Copilot", "PhotoAtelier"]},
}


def _extract_skills(text: str) -> list[str]:
    normalized = text.lower()
    return [skill for skill, aliases in SKILLS.items() if any(alias in normalized for alias in aliases)]


def _parse_number(pattern: str, text: str) -> int | None:
    match = re.search(pattern, text)
    return int(match.group(1)) if match else None


def analyze_job(item: AgentJobAnalyzeInput) -> dict[str, Any]:
    text = item.jd_text
    lower = text.lower()
    required = _extract_skills(text)
    portfolio_skills = set().union(*(entry["skills"] for entry in PORTFOLIO.values()))
    matched = [skill for skill in required if skill in portfolio_skills]
    missing = [skill for skill in required if skill not in portfolio_skills]
    blockers: list[str] = []
    if any(term in text for term in ["正式岗", "全职", "校招", "提前批"]):
        blockers.append("岗位疑似正式岗或校招，不属于在校实习范围")
    if any(term in text for term in ["仅毕业生", "仅2027届", "2027届专属"]):
        blockers.append("届别要求可能排除2028届")
    if "实习" not in text and "intern" not in lower:
        blockers.append("JD未明确说明是实习岗位")
    days = _parse_number(r"每周(?:至少)?\s*(\d)\s*天", text)
    months = _parse_number(r"(?:至少|持续)\s*(\d+)\s*个?月", text)
    score = 35 + min(40, len(matched) * 6)
    if "2028" in text or "在校" in text:
        score += 10
    if "远程" in text or any(city in text for city in ["南通", "南京", "上海", "苏州", "杭州"]):
        score += 10
    if days is not None and days >= 3:
        score += 5
    if months is not None and months >= 3:
        score += 5
    if blockers:
        score = min(score, 49)
    score = max(0, min(100, score))
    grade = "S" if score >= 85 else "A" if score >= 75 else "B" if score >= 60 else "C"
    citations = [entry["citation"] for entry in PORTFOLIO.values() if entry["skills"].intersection(matched)]
    return {
        "company": item.company,
        "title": item.title,
        "city": item.city,
        "district": item.district,
        "score": score,
        "grade": grade,
        "matched_skills": matched,
        "missing_skills": missing,
        "blockers": blockers,
        "days_per_week": days,
        "minimum_months": months,
        "citations": citations,
        "automatic_submission": False,
        "human_confirmation_required": True,
    }


def generate_resume(item: AgentResumeInput) -> dict[str, Any]:
    analysis = analyze_job(item)
    persona = PERSONAS[item.persona]
    selected_projects = [name for name in persona["order"] if PORTFOLIO[name]["skills"].intersection(analysis["matched_skills"])]
    if not selected_projects:
        selected_projects = persona["order"][:2]
    return {
        "persona": item.persona,
        "persona_label": persona["label"],
        "headline": f"2028届人工智能本科生 | {' · '.join(analysis['matched_skills'][:5]) or 'AI应用与全栈工程'}",
        "project_order": persona["order"],
        "selected_projects": selected_projects,
        "matched_keywords": analysis["matched_skills"],
        "missing_keywords": analysis["missing_skills"],
        "evidence_citations": analysis["citations"],
        "status": "draft",
        "automatic_send": False,
        "automatic_submission": False,
    }


def evaluate_agent(item: AgentEvaluateInput) -> dict[str, Any]:
    actual = {value for value in item.citations if value}
    expected = {value for value in item.expected_citations if value}
    covered = actual.intersection(expected)
    coverage = len(covered) / len(expected) if expected else (1.0 if actual else 0.0)
    unsupported = sorted(actual - expected) if expected else []
    failures: list[str] = []
    if len(item.output.strip()) < 20:
        failures.append("输出过短")
    if not actual:
        failures.append("缺少引用")
    if coverage < 1:
        failures.append("引用覆盖不足")
    if unsupported:
        failures.append("存在不受支持引用")
    return {
        "status": "passed" if not failures else "failed",
        "metrics": {
            "citation_coverage": round(coverage, 3),
            "citation_count": len(actual),
            "unsupported_claim_count": len(unsupported),
            "grounded": not failures,
        },
        "unsupported_citations": unsupported,
        "failures": failures,
    }
