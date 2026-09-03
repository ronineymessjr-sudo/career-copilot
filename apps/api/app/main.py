from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import connect, init_db
from .repository import (
    dashboard_summary, delivery_summary, list_applications, list_benchmark_runs, list_delivery_runs, list_jobs,
    list_model_runs, list_packages, model_metrics, save_delivery_run, upsert_application, upsert_job,
)
from .schemas import (
    ApprovalDecision, ApplicationUpdate, BenchmarkRequest, DeliveryRunInput, GitEvidenceRequest,
    AgentEvaluateInput, AgentJobAnalyzeInput, AgentResumeInput,
    InterviewInput, JobInput, ModelGenerateInput, OfferInput,
)
from .model_runtime import ModelGatewayError, generate_text, model_health
from .benchmark import run_benchmark
from .git_evidence import GitEvidenceError, collect_git_evidence
from .integrations.supabase_rest import SupabaseRestClient
from .supabase_sync import SupabaseSyncError, sync_local_to_supabase
from .workflow import WorkflowError, decide_package, evaluate_job_record, prepare_job_record
from .agent_demo import analyze_job as analyze_agent_job, evaluate_agent, generate_resume as generate_agent_resume


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Career Copilot V2 API",
    version="2.0.2",
    description="Evidence-driven AI internship discovery and application operating system.",
    lifespan=lifespan,
)

if settings.prototype_dir.exists():
    app.mount("/prototype-assets", StaticFiles(directory=settings.prototype_dir), name="prototype-assets")


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    if not settings.admin_token:
        raise HTTPException(503, "Admin token is not configured")
    if x_admin_token != settings.admin_token:
        raise HTTPException(401, "Invalid admin token")


@app.get("/health")
def health() -> dict:
    return {"status":"ok","mode":"approval-first","version":"2.0.2","data_backend":settings.data_backend}


@app.get("/", response_class=HTMLResponse)
def prototype() -> HTMLResponse:
    index=settings.prototype_dir / "index.html"
    if not index.exists():
        return HTMLResponse("<h1>Career Copilot V2</h1><p>Prototype not generated.</p>")
    html=index.read_text(encoding="utf-8").replace("./styles.css","/prototype-assets/styles.css").replace("./app.js","/prototype-assets/app.js")
    return HTMLResponse(html)


@app.post("/agent/analyze-job")
def agent_analyze_job(item: AgentJobAnalyzeInput):
    """Public-safe deterministic portfolio endpoint. It never reads private user data."""
    return analyze_agent_job(item)


@app.post("/agent/generate-resume")
def agent_generate_resume(item: AgentResumeInput):
    """Generate an evidence-referenced draft only; no external action is performed."""
    return generate_agent_resume(item)


@app.post("/agent/evaluate")
def agent_evaluate(item: AgentEvaluateInput):
    return evaluate_agent(item)


@app.get("/api/dashboard")
def dashboard():
    return dashboard_summary()


@app.post("/api/jobs/import")
def import_jobs(jobs: list[JobInput]):
    ids=[upsert_job(job) for job in jobs]
    return {"imported":len(ids),"job_ids":ids}


@app.get("/api/jobs")
def jobs(segment: str | None=None, grade: str | None=None):
    return list_jobs(segment,grade)


@app.post("/api/jobs/{job_id}/evaluate")
def evaluate(job_id: int):
    try:
        return evaluate_job_record(job_id)
    except KeyError as exc:
        raise HTTPException(404,str(exc)) from exc


@app.post("/api/jobs/{job_id}/prepare")
def prepare(job_id: int):
    try:
        package_id,package=prepare_job_record(job_id)
        return {"package_id":package_id,"package":package}
    except KeyError as exc:
        raise HTTPException(404,str(exc)) from exc
    except WorkflowError as exc:
        raise HTTPException(409,str(exc)) from exc


@app.get("/api/approvals")
def approvals(status: str | None="pending"):
    return list_packages(status)


@app.post("/api/approvals/{package_id}/decision")
def approval_decision(package_id: int, decision: ApprovalDecision):
    try:
        return decide_package(package_id,decision)
    except KeyError as exc:
        raise HTTPException(404,str(exc)) from exc


@app.get("/api/applications")
def applications():
    return list_applications()


@app.post("/api/applications/{job_id}/status")
def update_application(job_id: int, update: ApplicationUpdate):
    rows=list_jobs()
    row=next((r for r in rows if r["id"]==job_id),None)
    if not row:
        raise HTTPException(404,"岗位不存在")
    app_id=upsert_application(
        job_id,row["job"].get("channel","platform"),update.status,update.note,
        update.next_follow_up_at.isoformat() if update.next_follow_up_at else None,
    )
    return {"application_id":app_id,"status":update.status}


@app.post("/api/interviews")
def create_interview(item: InterviewInput):
    with connect() as conn:
        cursor=conn.execute(
            "INSERT INTO interviews(job_id,scheduled_at,round_name,mode,interviewer,notes) VALUES(?,?,?,?,?,?)",
            (item.job_id,item.scheduled_at.isoformat(),item.round_name,item.mode,item.interviewer,item.notes),
        )
        interview_id=cursor.lastrowid
    upsert_application(item.job_id,"platform","interview","已进入面试")
    return {"interview_id":interview_id}


@app.get("/api/interviews")
def interviews():
    with connect() as conn:
        rows=conn.execute("""
          SELECT i.*,j.company,j.title FROM interviews i JOIN jobs j ON j.id=i.job_id
          ORDER BY i.scheduled_at
        """).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/offers")
def create_offer(item: OfferInput):
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO offers(job_id,salary,start_date,deadline,status,notes) VALUES(?,?,?,?,?,?)
            ON CONFLICT(job_id) DO UPDATE SET salary=excluded.salary,start_date=excluded.start_date,
              deadline=excluded.deadline,status=excluded.status,notes=excluded.notes
            """,
            (item.job_id,item.salary,item.start_date.isoformat() if item.start_date else None,
             item.deadline.isoformat() if item.deadline else None,item.status,item.notes),
        )
    upsert_application(item.job_id,"platform","offer","已收到 Offer")
    return {"status":item.status}


@app.get("/api/offers")
def offers():
    with connect() as conn:
        rows=conn.execute("""
          SELECT o.*,j.company,j.title FROM offers o JOIN jobs j ON j.id=o.job_id ORDER BY o.created_at DESC
        """).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/analytics")
def analytics():
    summary=dashboard_summary()
    applications=list_applications()
    status_counts={}
    for item in applications:
        status_counts[item["status"]]=status_counts.get(item["status"],0)+1
    return {**summary,"application_statuses":status_counts}


@app.get("/api/model/health")
def get_model_health():
    return model_health()


@app.post("/api/model/generate")
def model_generate(item: ModelGenerateInput, x_admin_token: str | None = Header(default=None)):
    require_admin(x_admin_token)
    try:
        result = generate_text(item)
        return {
            "text": result.text,
            "provider": result.provider,
            "model": result.model,
            "latency_ms": result.latency_ms,
        }
    except ModelGatewayError as exc:
        raise HTTPException(502, str(exc)) from exc


@app.get("/api/model/metrics")
def get_model_metrics(limit: int = 30):
    return {"summary": model_metrics(), "runs": list_model_runs(limit)}


@app.post("/api/engineering/delivery-runs")
def create_delivery_run(item: DeliveryRunInput, x_admin_token: str | None = Header(default=None)):
    require_admin(x_admin_token)
    run_id = save_delivery_run(item)
    return {"run_id": run_id, "summary": delivery_summary()}


@app.get("/api/engineering/delivery-runs")
def delivery_runs(limit: int = 100):
    return list_delivery_runs(limit)


@app.get("/api/engineering/summary")
def engineering_summary():
    return {
        "delivery": delivery_summary(),
        "model": model_metrics(),
        "model_health": model_health(),
        "benchmarks": list_benchmark_runs(10),
        "supabase": SupabaseRestClient().health().__dict__,
    }


@app.get("/api/supabase/health")
def supabase_health():
    return SupabaseRestClient().health().__dict__


@app.post("/api/supabase/sync")
def supabase_sync(x_admin_token: str | None = Header(default=None)):
    require_admin(x_admin_token)
    try:
        return sync_local_to_supabase()
    except SupabaseSyncError as exc:
        raise HTTPException(409, str(exc)) from exc


@app.post("/api/engineering/git-evidence")
def git_evidence(item: GitEvidenceRequest, x_admin_token: str | None = Header(default=None)):
    require_admin(x_admin_token)
    try:
        return collect_git_evidence(item)
    except GitEvidenceError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post("/api/model/benchmarks")
def create_benchmark(item: BenchmarkRequest, x_admin_token: str | None = Header(default=None)):
    require_admin(x_admin_token)
    return run_benchmark(item)


@app.get("/api/model/benchmarks")
def benchmark_runs(limit: int = 30):
    return list_benchmark_runs(limit)


@app.get("/api/daily-report")
def daily_report():
    jobs=list_jobs()
    generated_at=datetime.now(ZoneInfo("Asia/Shanghai"))
    return {
        "date":generated_at.date().isoformat(),
        "generated_at":generated_at.isoformat(),
        "timezone":"Asia/Shanghai",
        "summary":dashboard_summary(),
        "top_recommendations":[row for row in jobs if row.get("evaluation") and row["evaluation"]["grade"] in {"S","A"}][:8],
        "pending_approvals":list_packages("pending"),
        "applications":list_applications(),
    }


@app.get("/assets/resumes/{filename}")
def resume_asset(filename: str):
    path=settings.resume_dir / Path(filename).name
    if not path.exists():
        raise HTTPException(404,"Resume not found")
    return FileResponse(path)
