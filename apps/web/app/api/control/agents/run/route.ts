import { NextRequest, NextResponse } from "next/server";
import { executeAgentTask } from "@/lib/agent-controller";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const TASKS = new Set(["rank_jobs", "rank_job", "generate_resume", "evaluate_grounding", "daily_report", "analyze_job", "mcp_tool"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const [runs, traces, evaluations] = await Promise.all([
      dataRequest<Array<Record<string, any>>>(auth, "agent_runs?select=*&order=started_at.desc&limit=50"),
      dataRequest<Array<Record<string, any>>>(auth, "agent_traces?select=*&order=started_at.desc&limit=200"),
      dataRequest<Array<Record<string, any>>>(auth, "evaluation_runs?select=*&order=created_at.desc&limit=50"),
    ]);
    const traceByRun = new Map<string, Array<Record<string, any>>>();
    for (const trace of traces) {
      const key = String(trace.run_id);
      const list = traceByRun.get(key) ?? [];
      list.push(trace);
      traceByRun.set(key, list);
    }
    return NextResponse.json({ ok: true, runs: runs.map((run) => ({ ...run, traces: traceByRun.get(String(run.id)) ?? [] })), evaluations });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const taskType = String(body.task_type ?? "").trim();
    if (!TASKS.has(taskType)) return NextResponse.json({ ok: false, error: "不支持的 Agent 任务" }, { status: 422 });
    const result = await executeAgentTask({
      data: <T>(resource: string, init?: RequestInit) => dataRequest<T>(auth, resource, init),
      userId: auth.userId,
      taskType,
      input: body.input ?? body,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) { return controlError(error); }
}
