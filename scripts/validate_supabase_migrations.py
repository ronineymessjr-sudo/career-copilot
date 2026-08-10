from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"

BASE_TABLES = {
    "profiles", "companies", "jobs", "job_evaluations", "career_evidence",
    "resume_versions", "application_packages", "applications", "interviews",
    "offers", "source_snapshots", "model_runs", "delivery_runs",
    "model_benchmark_runs", "application_events", "job_sources", "discovery_runs",
    "interview_feedback", "skill_gaps", "weekly_reviews", "operational_events",
    "career_documents", "career_chunks", "workflow_threads",
    "workflow_checkpoints", "langgraph_checkpoints", "langgraph_writes",
    "agent_runs", "agent_messages", "agent_traces", "job_scores",
    "resume_alignments", "evaluation_runs", "mcp_tool_registry", "daily_agent_reports",
}
ENUMS = {"job_workplace", "company_tier", "application_status", "approval_status"}


def read(name: str) -> str:
    path = MIGRATIONS / name
    if not path.exists():
        raise SystemExit(f"missing migration: {name}")
    return path.read_text(encoding="utf-8")


repair = read("0009_vector_extension_schema.sql")
guard = read("0027_career_copilot_schema_guard.sql")

if "create schema if not exists career_copilot" not in repair.lower():
    raise SystemExit("0009 must create career_copilot before later migrations use it")
if "create schema if not exists career_copilot" not in guard.lower():
    raise SystemExit("0027 must be idempotent and create career_copilot")

for name in sorted(BASE_TABLES):
    if name not in repair or name not in guard:
        raise SystemExit(f"schema repair does not cover table: {name}")
for name in sorted(ENUMS):
    if name not in repair or name not in guard:
        raise SystemExit(f"schema repair does not cover enum: {name}")

if "raise exception 'Career Copilot schema is incomplete" not in guard:
    raise SystemExit("0027 must fail closed when the isolated base is incomplete")
if re.search(r"drop\s+(table|schema)\b", repair + guard, re.I):
    raise SystemExit("schema repair must not drop existing objects")

print(f"supabase migration chain valid: {len(BASE_TABLES)} tables, {len(ENUMS)} enums, isolated schema guard present")
