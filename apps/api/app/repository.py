from __future__ import annotations

import json
from datetime import datetime, timezone

from .db import connect
from .schemas import EvaluationResult, JobInput, PreparedPackage


def upsert_job(job: JobInput) -> int:
    payload = job.model_dump(mode="json")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO jobs(source_id,payload,company,title,city,district,workplace,company_tier,status)
            VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(source_id) DO UPDATE SET
              payload=excluded.payload, company=excluded.company, title=excluded.title,
              city=excluded.city, district=excluded.district, workplace=excluded.workplace,
              company_tier=excluded.company_tier, status=excluded.status,
              updated_at=CURRENT_TIMESTAMP
            """,
            (job.source_id, json.dumps(payload, ensure_ascii=False), job.company, job.title, job.city,
             job.district, job.workplace, job.company_tier, job.status),
        )
        row = conn.execute("SELECT id FROM jobs WHERE source_id=?", (job.source_id,)).fetchone()
        return int(row["id"])


def get_job(job_id: int) -> JobInput:
    with connect() as conn:
        row = conn.execute("SELECT payload FROM jobs WHERE id=?", (job_id,)).fetchone()
    if not row:
        raise KeyError("岗位不存在")
    return JobInput.model_validate(json.loads(row["payload"]))


def save_evaluation(job_id: int, result: EvaluationResult) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO evaluations(job_id,payload,score,grade,segment)
            VALUES(?,?,?,?,?)
            ON CONFLICT(job_id) DO UPDATE SET payload=excluded.payload,score=excluded.score,
              grade=excluded.grade,segment=excluded.segment,evaluated_at=CURRENT_TIMESTAMP
            """,
            (job_id, result.model_dump_json(), result.total_score, result.grade, result.segment),
        )


def get_evaluation(job_id: int) -> EvaluationResult | None:
    with connect() as conn:
        row = conn.execute("SELECT payload FROM evaluations WHERE job_id=?", (job_id,)).fetchone()
    return EvaluationResult.model_validate_json(row["payload"]) if row else None


def save_package(package: PreparedPackage) -> int:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO packages(job_id,payload,approval_status)
            VALUES(?,?,?)
            ON CONFLICT(job_id) DO UPDATE SET payload=excluded.payload,
              approval_status=excluded.approval_status,updated_at=CURRENT_TIMESTAMP
            """,
            (package.job_id, package.model_dump_json(), package.approval_status),
        )
        row = conn.execute("SELECT id FROM packages WHERE job_id=?", (package.job_id,)).fetchone()
        return int(row["id"])


def get_package(package_id: int) -> tuple[int, PreparedPackage]:
    with connect() as conn:
        row = conn.execute("SELECT job_id,payload FROM packages WHERE id=?", (package_id,)).fetchone()
    if not row:
        raise KeyError("审批包不存在")
    return int(row["job_id"]), PreparedPackage.model_validate_json(row["payload"])


def set_package_status(package_id: int, package: PreparedPackage) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE packages SET payload=?,approval_status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (package.model_dump_json(), package.approval_status, package_id),
        )


def upsert_application(job_id: int, channel: str, status: str, note: str = "", next_follow_up_at: str | None = None) -> int:
    submitted_at = datetime.now(timezone.utc).isoformat() if status == "submitted" else None
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO applications(job_id,channel,status,note,submitted_at,next_follow_up_at)
            VALUES(?,?,?,?,?,?)
            ON CONFLICT(job_id) DO UPDATE SET channel=excluded.channel,status=excluded.status,
              note=excluded.note,submitted_at=COALESCE(excluded.submitted_at,applications.submitted_at),
              next_follow_up_at=excluded.next_follow_up_at,updated_at=CURRENT_TIMESTAMP
            """,
            (job_id, channel, status, note, submitted_at, next_follow_up_at),
        )
        row = conn.execute("SELECT id FROM applications WHERE job_id=?", (job_id,)).fetchone()
        return int(row["id"])


def list_jobs(segment: str | None = None, grade: str | None = None) -> list[dict]:
    query = """
      SELECT j.id,j.payload,e.payload AS evaluation,a.status AS application_status,
             p.approval_status
      FROM jobs j
      LEFT JOIN evaluations e ON e.job_id=j.id
      LEFT JOIN applications a ON a.job_id=j.id
      LEFT JOIN packages p ON p.job_id=j.id
      ORDER BY COALESCE(e.score,0) DESC,j.updated_at DESC
    """
    with connect() as conn:
        rows = conn.execute(query).fetchall()
    result=[]
    for row in rows:
        job=json.loads(row["payload"])
        evaluation=json.loads(row["evaluation"]) if row["evaluation"] else None
        if segment and (not evaluation or evaluation.get("segment") != segment):
            continue
        if grade and (not evaluation or evaluation.get("grade") != grade):
            continue
        result.append({
            "id": row["id"], "job": job, "evaluation": evaluation,
            "application_status": row["application_status"],
            "approval_status": row["approval_status"],
        })
    return result


def list_packages(status: str | None = None) -> list[dict]:
    sql="""
      SELECT p.id,p.payload,p.approval_status,j.company,j.title,j.payload AS job_payload,
             e.payload AS evaluation
      FROM packages p JOIN jobs j ON j.id=p.job_id
      LEFT JOIN evaluations e ON e.job_id=p.job_id
    """
    params=()
    if status:
        sql += " WHERE p.approval_status=?"
        params=(status,)
    sql += " ORDER BY p.updated_at DESC"
    with connect() as conn:
        rows=conn.execute(sql,params).fetchall()
    return [{
        "package_id":r["id"],"approval_status":r["approval_status"],
        "package":json.loads(r["payload"]),"job":json.loads(r["job_payload"]),
        "evaluation":json.loads(r["evaluation"]) if r["evaluation"] else None,
    } for r in rows]


def list_applications() -> list[dict]:
    with connect() as conn:
        rows=conn.execute("""
          SELECT a.*,j.company,j.title,j.payload AS job_payload
          FROM applications a JOIN jobs j ON j.id=a.job_id
          ORDER BY a.updated_at DESC
        """).fetchall()
    return [{
        "id":r["id"],"job_id":r["job_id"],"company":r["company"],"title":r["title"],
        "channel":r["channel"],"status":r["status"],"note":r["note"],
        "submitted_at":r["submitted_at"],"next_follow_up_at":r["next_follow_up_at"],
        "job":json.loads(r["job_payload"]),
    } for r in rows]


def dashboard_summary() -> dict:
    with connect() as conn:
        total=conn.execute("SELECT COUNT(*) c FROM jobs").fetchone()["c"]
        recommended=conn.execute("SELECT COUNT(*) c FROM evaluations WHERE score>=75").fetchone()["c"]
        pending=conn.execute("SELECT COUNT(*) c FROM packages WHERE approval_status='pending'").fetchone()["c"]
        submitted=conn.execute("SELECT COUNT(*) c FROM applications WHERE status='submitted'").fetchone()["c"]
        interviews=conn.execute("SELECT COUNT(*) c FROM interviews").fetchone()["c"]
        offers=conn.execute("SELECT COUNT(*) c FROM offers WHERE status IN ('received','accepted')").fetchone()["c"]
        segments=conn.execute("SELECT segment,COUNT(*) c FROM evaluations GROUP BY segment ORDER BY c DESC").fetchall()
        grades=conn.execute("SELECT grade,COUNT(*) c FROM evaluations GROUP BY grade ORDER BY grade").fetchall()
    return {
        "metrics":{"total_jobs":total,"recommended":recommended,"pending_approval":pending,
                   "submitted":submitted,"interviews":interviews,"offers":offers},
        "segments":[dict(r) for r in segments],"grades":[dict(r) for r in grades],
    }


def save_model_run(
    *,
    provider: str,
    model_name: str,
    endpoint: str,
    prompt_hash: str,
    input_chars: int,
    output_chars: int,
    latency_ms: int,
    success: bool,
    error: str = "",
) -> int:
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO model_runs(
              provider,model_name,endpoint,prompt_hash,input_chars,output_chars,
              latency_ms,success,error
            ) VALUES(?,?,?,?,?,?,?,?,?)
            """,
            (
                provider,
                model_name,
                endpoint,
                prompt_hash,
                input_chars,
                output_chars,
                latency_ms,
                1 if success else 0,
                error or None,
            ),
        )
        return int(cursor.lastrowid)


def list_model_runs(limit: int = 50) -> list[dict]:
    safe_limit = max(1, min(limit, 200))
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM model_runs ORDER BY created_at DESC,id DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def model_metrics() -> dict:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS total_runs,
                   SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS successful_runs,
                   AVG(latency_ms) AS average_latency_ms,
                   SUM(input_chars) AS input_chars,
                   SUM(output_chars) AS output_chars
            FROM model_runs
            """
        ).fetchone()
        providers = conn.execute(
            """
            SELECT provider,model_name,COUNT(*) AS runs,
                   AVG(latency_ms) AS average_latency_ms,
                   SUM(CASE WHEN success=1 THEN 1 ELSE 0 END) AS successful_runs
            FROM model_runs
            GROUP BY provider,model_name
            ORDER BY runs DESC
            """
        ).fetchall()
    total = int(row["total_runs"] or 0)
    success = int(row["successful_runs"] or 0)
    return {
        "total_runs": total,
        "successful_runs": success,
        "success_rate": round(success / total * 100, 1) if total else 0,
        "average_latency_ms": round(float(row["average_latency_ms"] or 0), 1),
        "input_chars": int(row["input_chars"] or 0),
        "output_chars": int(row["output_chars"] or 0),
        "providers": [dict(item) for item in providers],
    }


def save_delivery_run(item) -> int:
    duration_minutes = round((item.finished_at - item.started_at).total_seconds() / 60, 2)
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO delivery_runs(
              project,task_name,agent_tool,started_at,finished_at,duration_minutes,
              files_changed,ai_generated_lines,human_edited_lines,tests_run,tests_passed,
              acceptance_criteria_total,acceptance_criteria_met,notes,source_ref,
              evidence_type,data_quality,branch,commit_sha,ci_run_url,insertions,deletions
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                item.project,
                item.task_name,
                item.agent_tool,
                item.started_at.isoformat(),
                item.finished_at.isoformat(),
                duration_minutes,
                item.files_changed,
                item.ai_generated_lines,
                item.human_edited_lines,
                item.tests_run,
                item.tests_passed,
                item.acceptance_criteria_total,
                item.acceptance_criteria_met,
                item.notes,
                item.source_ref,
                item.evidence_type,
                item.data_quality,
                item.branch or None,
                item.commit_sha or None,
                item.ci_run_url or None,
                item.insertions,
                item.deletions,
            ),
        )
        return int(cursor.lastrowid)


def list_delivery_runs(limit: int = 100) -> list[dict]:
    safe_limit = max(1, min(limit, 500))
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM delivery_runs ORDER BY finished_at DESC,id DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def delivery_summary() -> dict:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS total_runs,
                   SUM(duration_minutes) AS total_minutes,
                   SUM(files_changed) AS files_changed,
                   SUM(ai_generated_lines) AS ai_generated_lines,
                   SUM(human_edited_lines) AS human_edited_lines,
                   SUM(tests_run) AS tests_run,
                   SUM(tests_passed) AS tests_passed,
                   SUM(acceptance_criteria_total) AS criteria_total,
                   SUM(acceptance_criteria_met) AS criteria_met,
                   SUM(insertions) AS insertions,
                   SUM(deletions) AS deletions,
                   SUM(CASE WHEN data_quality='automated' THEN 1 ELSE 0 END) AS automated_runs
            FROM delivery_runs
            """
        ).fetchone()
        projects = conn.execute(
            """
            SELECT project,COUNT(*) AS runs,SUM(duration_minutes) AS minutes,
                   SUM(tests_passed) AS tests_passed,SUM(tests_run) AS tests_run
            FROM delivery_runs
            GROUP BY project
            ORDER BY runs DESC,project
            """
        ).fetchall()
    generated = int(row["ai_generated_lines"] or 0)
    edited = int(row["human_edited_lines"] or 0)
    tests_run = int(row["tests_run"] or 0)
    tests_passed = int(row["tests_passed"] or 0)
    criteria_total = int(row["criteria_total"] or 0)
    criteria_met = int(row["criteria_met"] or 0)
    reviewed_lines = generated + edited
    return {
        "total_runs": int(row["total_runs"] or 0),
        "total_hours": round(float(row["total_minutes"] or 0) / 60, 2),
        "files_changed": int(row["files_changed"] or 0),
        "ai_generated_lines": generated,
        "human_edited_lines": edited,
        "human_edit_share": round(edited / reviewed_lines * 100, 1) if reviewed_lines else 0,
        "tests_run": tests_run,
        "tests_passed": tests_passed,
        "test_pass_rate": round(tests_passed / tests_run * 100, 1) if tests_run else 0,
        "acceptance_criteria_total": criteria_total,
        "acceptance_criteria_met": criteria_met,
        "acceptance_rate": round(criteria_met / criteria_total * 100, 1) if criteria_total else 0,
        "git_insertions": int(row["insertions"] or 0),
        "git_deletions": int(row["deletions"] or 0),
        "automated_runs": int(row["automated_runs"] or 0),
        "projects": [dict(item) for item in projects],
    }


def save_benchmark_run(result: dict) -> int:
    with connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO model_benchmark_runs(
              provider,model_name,suite_name,is_demo,comparable,cases_total,cases_succeeded,
              average_latency_ms,p95_latency_ms,semantic_pass_rate,notes,payload
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                result["provider"], result["model_name"], result["suite_name"],
                1 if result.get("is_demo") else 0,
                1 if result.get("comparable") else 0,
                result["cases_total"], result["cases_succeeded"],
                result["average_latency_ms"], result["p95_latency_ms"],
                result.get("semantic_pass_rate"), result.get("notes", ""),
                json.dumps(result, ensure_ascii=False),
            ),
        )
        return int(cursor.lastrowid)


def list_benchmark_runs(limit: int = 30) -> list[dict]:
    safe_limit = max(1, min(limit, 100))
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM model_benchmark_runs ORDER BY created_at DESC,id DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item["is_demo"] = bool(item["is_demo"])
        item["comparable"] = bool(item["comparable"])
        item["payload"] = json.loads(item["payload"])
        result.append(item)
    return result
