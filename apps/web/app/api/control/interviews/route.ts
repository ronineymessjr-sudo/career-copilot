import { NextRequest, NextResponse } from "next/server";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const TYPES = new Set(["hr", "technical", "product", "case", "behavioral", "mixed"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [interviews, applications, jobs, evaluations, packages, feedback, gaps] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "interviews?select=*&order=scheduled_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "applications?select=*"),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=*"),
      dataRequest<Array<Record<string, any>>>(auth, "job_evaluations?select=*"),
      dataRequest<Array<Record<string, any>>>(auth, "application_packages?select=*"),
      dataRequest<Array<Record<string, any>>>(auth, "interview_feedback?select=*&order=created_at"),
      dataRequest<Array<Record<string, any>>>(auth, "skill_gaps?select=*&order=severity.desc,updated_at.desc"),
    ]);
    const appById = new Map(applications.map((item) => [String(item.id), item]));
    const jobById = new Map(jobs.map((item) => [String(item.id), item]));
    const evaluationByJob = new Map(evaluations.map((item) => [String(item.job_id), item]));
    const packageById = new Map(packages.map((item) => [String(item.id), item]));
    const result = interviews.map((interview) => {
      const application = appById.get(String(interview.application_id)) ?? null;
      const job = application ? jobById.get(String(application.job_id)) ?? null : null;
      return {
        ...interview,
        application,
        job,
        evaluation: job ? evaluationByJob.get(String(job.id)) ?? null : null,
        application_package: application ? packageById.get(String(application.package_id)) ?? null : null,
        feedback: feedback.filter((item) => String(item.interview_id) === String(interview.id)),
        skill_gaps: gaps.filter((item) => String(item.source_id) === String(interview.id)),
      };
    });
    const eligibleStatuses = new Set(["submitted", "read", "contacting", "test", "interview", "offer"]);
    const eligibleApplications = applications
      .map<Record<string, any>>((application) => ({
        ...application,
        job: jobById.get(String(application.job_id)) ?? null,
      }))
      .filter((item) => eligibleStatuses.has(String(item.status)));
    return NextResponse.json({ ok: true, interviews: result, applications: eligibleApplications, skill_gaps: gaps });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const applicationId = String(body.application_id ?? "").trim();
    const roundName = String(body.round_name ?? "").trim();
    const scheduledAt = new Date(body.scheduled_at);
    const interviewType = TYPES.has(body.interview_type) ? body.interview_type : "mixed";
    if (!applicationId || !roundName || !Number.isFinite(scheduledAt.getTime())) {
      return NextResponse.json({ ok: false, error: "application_id、round_name 和有效 scheduled_at 为必填项" }, { status: 422 });
    }
    const applications = await dataRequest<Array<Record<string, any>>>(auth, `applications?select=id,status&id=eq.${encodeURIComponent(applicationId)}&limit=1`);
    if (!applications[0]) return NextResponse.json({ ok: false, error: "投递记录不存在" }, { status: 404 });
    const rows = await dataRequest<Array<Record<string, any>>>(auth, "interviews", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        user_id: auth.userId,
        application_id: applicationId,
        scheduled_at: scheduledAt.toISOString(),
        round_name: roundName,
        mode: String(body.mode ?? "video").trim(),
        interviewer: String(body.interviewer ?? "").trim(),
        interview_type: interviewType,
        duration_minutes: body.duration_minutes ? Math.max(5, Math.min(Number(body.duration_minutes), 480)) : null,
        status: "scheduled",
        preparation_status: "not_started",
        readiness_score: 0,
        preparation_plan: {},
        feedback_summary: {},
        notes: "",
      }]),
    });
    return NextResponse.json({ ok: true, interview: rows[0] }, { status: 201 });
  } catch (error) { return controlError(error); }
}
