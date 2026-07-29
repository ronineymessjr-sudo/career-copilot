import { DEFAULT_DISPATCH_POLICY, normalizeDispatchPolicy, selectDispatchCandidates } from "@/lib/dispatch-rules.mjs";
import type { AgentData } from "@/lib/agent-service";

type Row = Record<string, any>;
const enc = (value: unknown) => encodeURIComponent(String(value ?? ""));
const today = () => new Date().toISOString().slice(0, 10);

export async function loadDispatchPolicy(data: AgentData, userId: string): Promise<Row> {
  const rows = await data<Row[]>(`daily_application_policies?select=*&user_id=eq.${enc(userId)}&limit=1`);
  return normalizeDispatchPolicy(rows[0] ?? DEFAULT_DISPATCH_POLICY);
}

export async function buildDailyDispatchBatch({ data, userId, batchDate = today() }: { data: AgentData; userId: string; batchDate?: string }) {
  const existing = await data<Row[]>(`application_batches?select=*&user_id=eq.${enc(userId)}&batch_date=eq.${enc(batchDate)}&limit=1`);
  if (existing[0]) {
    const dispatches = await data<Row[]>(`application_dispatches?select=*&batch_id=eq.${enc(existing[0].id)}&order=created_at.asc`);
    return { batch: existing[0], dispatches, reused: true };
  }
  const policy = await loadDispatchPolicy(data, userId);
  const [applications, jobs, packages, scores] = await Promise.all([
    data<Row[]>(`applications?select=*&user_id=eq.${enc(userId)}&status=eq.ready_to_submit`),
    data<Row[]>(`jobs?select=*&user_id=eq.${enc(userId)}`),
    data<Row[]>(`application_packages?select=*&user_id=eq.${enc(userId)}`),
    data<Row[]>(`job_scores?select=*&user_id=eq.${enc(userId)}&order=scored_at.desc`),
  ]);
  const jobById = new Map(jobs.map((item) => [String(item.id), item]));
  const packageById = new Map(packages.map((item) => [String(item.id), item]));
  const scoreByJob = new Map<string, Row>();
  for (const score of scores) if (!scoreByJob.has(String(score.job_id))) scoreByJob.set(String(score.job_id), score);
  const candidates = selectDispatchCandidates(applications.map((application) => ({
    application,
    job: jobById.get(String(application.job_id)),
    applicationPackage: packageById.get(String(application.package_id)),
    score: scoreByJob.get(String(application.job_id)),
  })), policy) as Array<{ application: Row; job: Row; applicationPackage: Row; score: Row }>;
  const batchRows = await data<Row[]>("application_batches", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ user_id: userId, batch_date: batchDate, status: "queued", selection_summary: {
      eligible_count: candidates.length,
      policy: normalizeDispatchPolicy(policy),
      generated_by: "daily_agent_cycle",
    } }]),
  });
  const batch = batchRows[0];
  if (!batch) throw new Error("无法创建每日投递批次");
  const dispatchPayload = candidates.map(({ application, job, applicationPackage, score }) => ({
    user_id: userId,
    batch_id: batch.id,
    application_id: application.id,
    channel: String(application.channel ?? job.channel ?? "platform"),
    target_url: String(job.source_url),
    payload_snapshot: {
      job: { id: job.id, company_name: job.company_name, title: job.title, source_url: job.source_url },
      application: { id: application.id, channel: application.channel },
      package: { id: applicationPackage.id, resume_version_name: applicationPackage.resume_version_name, greeting: applicationPackage.greeting },
      score: { final_score: score.final_score, grade: score.grade },
      requires_platform_session: true,
      final_submission_mode: "user_browser",
    },
  }));
  const dispatches = dispatchPayload.length ? await data<Row[]>("application_dispatches", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(dispatchPayload),
  }) : [];
  return { batch, dispatches, reused: false };
}
