import { NextRequest, NextResponse } from "next/server";
import { executeAgentTask } from "@/lib/agent-controller";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [scores, jobs] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "job_scores?select=*&order=final_score.desc,scored_at.desc"),
      dataRequest<Array<Record<string, any>>>(auth, "jobs?select=*&order=updated_at.desc"),
    ]);
    const jobById = new Map(jobs.map((job) => [String(job.id), job]));
    return NextResponse.json({ ok: true, scores: scores.map((score) => ({ ...score, job: jobById.get(String(score.job_id)) ?? null })) });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json().catch(() => ({}));
    const result = await executeAgentTask({
      data: <T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init),
      userId: auth.userId,
      taskType: body.job_id ? "rank_job" : "rank_jobs",
      input: { job_id: body.job_id ?? null, limit: body.limit ?? 50 },
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) { return controlError(error); }
}
