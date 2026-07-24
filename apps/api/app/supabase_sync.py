from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .config import settings
from .integrations.supabase_rest import SupabaseRestClient
from .repository import (
    list_applications,
    list_delivery_runs,
    list_jobs,
    list_model_runs,
    list_packages,
)


class SupabaseSyncError(RuntimeError):
    pass


def _date(value: str | None) -> str | None:
    if not value:
        return None
    return str(value)[:10]


def _job_row(item: dict[str, Any]) -> dict[str, Any]:
    job = item["job"]
    return {
        "source_id": job["source_id"],
        "title": job["title"],
        "description": job.get("description", ""),
        "requirements": job.get("requirements", ""),
        "city": job.get("city", ""),
        "district": job.get("district", ""),
        "address": job.get("address", ""),
        "workplace": job.get("workplace", "unknown"),
        "is_internship": job.get("is_internship", True),
        "accepts_students": job.get("accepts_students"),
        "accepts_2028": job.get("accepts_2028"),
        "graduation_requirement": job.get("graduation_requirement", ""),
        "days_per_week": job.get("days_per_week"),
        "minimum_months": job.get("minimum_months"),
        "salary": job.get("salary", ""),
        "published_at": _date(job.get("published_at")),
        "deadline": _date(job.get("deadline")),
        "source_name": job.get("source_name", ""),
        "source_url": str(job["source_url"]) if job.get("source_url") else None,
        "source_reliability": job.get("source_reliability", 3),
        "channel": job.get("channel", "platform"),
        "recruiter_email": job.get("recruiter_email"),
        "raw_payload": job,
        "status": job.get("status", "open"),
        "company_name": job.get("company", ""),
        "company_tier_text": job.get("company_tier", "unknown"),
        "company_stage": job.get("company_stage", ""),
        "company_size": job.get("company_size", ""),
    }


def sync_local_to_supabase(client: SupabaseRestClient | None = None) -> dict[str, Any]:
    client = client or SupabaseRestClient()
    if not client.configured:
        raise SupabaseSyncError("Supabase is not configured")

    local_jobs = list_jobs()
    remote_jobs = client.upsert(
        "jobs",
        [_job_row(item) for item in local_jobs],
        on_conflict="user_id,source_id",
        return_rows=True,
    )
    source_to_id = {row["source_id"]: row["id"] for row in remote_jobs}
    if len(source_to_id) != len(local_jobs):
        raise SupabaseSyncError("Supabase did not return a complete job ID mapping")

    evaluations = []
    local_id_to_remote: dict[int, str] = {}
    for item in local_jobs:
        source_id = item["job"]["source_id"]
        remote_id = source_to_id[source_id]
        local_id_to_remote[int(item["id"])] = remote_id
        evaluation = item.get("evaluation")
        if not evaluation:
            continue
        evaluations.append({
            "job_id": remote_id,
            "total_score": evaluation["total_score"],
            "grade": evaluation["grade"],
            "segment": evaluation["segment"],
            "eligible": evaluation["eligible"],
            "needs_confirmation": evaluation["needs_confirmation"],
            "score_breakdown": evaluation,
            "matched_skills": evaluation.get("matched_skills", []),
            "missing_skills": evaluation.get("missing_skills", []),
            "hr_preference": evaluation.get("inferred_hr_preference", ""),
            "risks": evaluation.get("interview_risks", []),
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
        })
    client.upsert("job_evaluations", evaluations, on_conflict="user_id,job_id")

    package_rows = []
    local_package_to_remote_job: dict[int, str] = {}
    for item in list_packages(None):
        package = item["package"]
        remote_job_id = local_id_to_remote[int(package["job_id"])]
        local_package_to_remote_job[int(item["package_id"])] = remote_job_id
        package_rows.append({
            "job_id": remote_job_id,
            "resume_version_name": package.get("resume_version", ""),
            "resume_filename": package.get("resume_filename", ""),
            "greeting": package.get("greeting", ""),
            "email_subject": package.get("email_subject"),
            "email_body": package.get("email_body"),
            "highlighted_keywords": package.get("highlighted_keywords", []),
            "evidence_refs": package.get("evidence_summary", []),
            "truth_check": {
                "passed": package.get("truth_check_passed", False),
                "notes": package.get("truth_check_notes", []),
            },
            "approval": package.get("approval_status", item.get("approval_status", "pending")),
        })
    client.upsert("application_packages", package_rows, on_conflict="user_id,job_id")

    application_rows = []
    for item in list_applications():
        remote_job_id = local_id_to_remote[int(item["job_id"])]
        application_rows.append({
            "job_id": remote_job_id,
            "channel": item.get("channel", "platform"),
            "status": item.get("status", "prepared"),
            "submitted_at": item.get("submitted_at"),
            "next_follow_up_at": item.get("next_follow_up_at"),
            "notes": item.get("note", ""),
        })
    client.upsert("applications", application_rows, on_conflict="user_id,job_id")

    model_rows = []
    for row in list_model_runs(500):
        model_rows.append({
            "local_id": row["id"],
            "provider": row["provider"],
            "model_name": row["model_name"],
            "endpoint": row["endpoint"],
            "prompt_hash": row["prompt_hash"],
            "input_chars": row["input_chars"],
            "output_chars": row["output_chars"],
            "latency_ms": row["latency_ms"],
            "success": bool(row["success"]),
            "error": row.get("error"),
            "created_at": row["created_at"],
        })
    client.upsert("model_runs", model_rows, on_conflict="user_id,local_id")

    delivery_rows = []
    for row in list_delivery_runs(500):
        delivery_rows.append({
            "local_id": row["id"],
            "project": row["project"],
            "task_name": row["task_name"],
            "agent_tool": row["agent_tool"],
            "started_at": row["started_at"],
            "finished_at": row["finished_at"],
            "duration_minutes": row["duration_minutes"],
            "files_changed": row["files_changed"],
            "ai_generated_lines": row["ai_generated_lines"],
            "human_edited_lines": row["human_edited_lines"],
            "tests_run": row["tests_run"],
            "tests_passed": row["tests_passed"],
            "acceptance_criteria_total": row["acceptance_criteria_total"],
            "acceptance_criteria_met": row["acceptance_criteria_met"],
            "notes": row.get("notes"),
            "source_ref": row.get("source_ref"),
            "created_at": row["created_at"],
        })
    client.upsert("delivery_runs", delivery_rows, on_conflict="user_id,local_id")

    return {
        "mode": settings.data_backend,
        "jobs": len(local_jobs),
        "evaluations": len(evaluations),
        "packages": len(package_rows),
        "applications": len(application_rows),
        "model_runs": len(model_rows),
        "delivery_runs": len(delivery_rows),
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }
