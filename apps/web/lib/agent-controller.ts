import { runCareerAgent, loadAgentContext, persistRankings, type AgentData } from "@/lib/agent-service";

type Row = Record<string, any>;

function enc(value: unknown) { return encodeURIComponent(String(value ?? "")); }
function safeJson(value: unknown) { return JSON.parse(JSON.stringify(value ?? null)); }

export async function executeAgentTask({
  data,
  userId,
  taskType,
  input,
}: {
  data: AgentData;
  userId: string;
  taskType: string;
  input: Row;
}) {
  const started = Date.now();
  const runs = await data<Row[]>("agent_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      user_id: userId,
      agent_name: "career_supervisor",
      task_type: taskType,
      status: "running",
      subject_type: input.job_id ? "job" : taskType === "generate_resume" ? "resume" : "workspace",
      subject_id: input.job_id || null,
      input: safeJson(input),
      requires_human: false,
    }]),
  });
  const run = runs[0];
  try {
    const context = await loadAgentContext(data, userId);
    const state = await runCareerAgent(taskType, input, context) as Row;
    const result = state.result ?? {};
    const traces = Array.isArray(state.traces) ? state.traces : [];
    const evaluation = state.evaluation ?? null;

    if (taskType === "rank_jobs" || taskType === "rank_job") {
      const ranked = (result.ranked ?? []).map((item: Row) => ({ job: item.job, score: item }));
      await persistRankings(data, userId, run.id, ranked);
    }

    let resume: Row | null = null;
    if (taskType === "generate_resume" && result?.target_job_id) {
      let profile = context.profile;
      if (!profile) {
        const profiles = await data<Row[]>("profiles", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify([{ user_id: userId, graduation_year: 2028, major: "人工智能", degree: "本科" }]),
        });
        profile = profiles[0];
      }
      if (!profile?.id) throw new Error("无法创建或读取用户 Profile");
      const existing = await data<Row[]>(`resume_versions?select=version_no&profile_id=eq.${enc(profile.id)}&persona=eq.${enc(result.persona)}&order=version_no.desc&limit=1`);
      const versionNo = Number(existing[0]?.version_no ?? 0) + 1;
      const rows = await data<Row[]>("resume_versions", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          profile_id: profile.id,
          name: result.name,
          role_family: result.role_family,
          persona: result.persona,
          version_no: versionNo,
          status: "draft",
          target_job_id: result.target_job_id,
          source_agent_run_id: run.id,
          content: safeJson(result),
          evidence_refs: safeJson(result.evidence_refs ?? []),
          alignment_summary: safeJson(result.alignment ?? {}),
          is_master: false,
        }]),
      });
      resume = rows[0];
      await data("resume_alignments", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([{
          user_id: userId,
          resume_version_id: resume.id,
          job_id: result.target_job_id,
          alignment_score: Number(result.alignment?.score ?? 0),
          matched_keywords: result.alignment?.matched_keywords ?? [],
          missing_keywords: result.alignment?.missing_keywords ?? [],
          evidence_refs: result.evidence_refs ?? [],
          explanation: result.alignment?.explanation ?? [],
        }]),
      });
    }

    let evaluationRow: Row | null = null;
    if (evaluation) {
      const rows = await data<Row[]>("evaluation_runs", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify([{
          user_id: userId,
          run_id: run.id,
          evaluation_type: taskType === "rank_jobs" || taskType === "rank_job" ? "ranking" : taskType === "generate_resume" ? "resume" : "agent_grounding",
          status: evaluation.status === "passed" ? "passed" : "failed",
          dataset_version: "m08-v1",
          metrics: evaluation.metrics ?? {},
          failures: evaluation.failures ?? [],
          sample_count: 1,
        }]),
      });
      evaluationRow = rows[0];
    }

    if (traces.length) {
      await data("agent_traces", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(traces.map((trace: Row, index: number) => ({
          user_id: userId,
          run_id: run.id,
          sequence_no: Number(trace.sequence_no ?? index),
          node_name: trace.node_name ?? `node_${index}`,
          status: trace.status ?? "completed",
          input_summary: safeJson(trace.input_summary ?? {}),
          output_summary: safeJson(trace.output_summary ?? {}),
          evidence_refs: safeJson(trace.evidence_refs ?? []),
          completed_at: new Date().toISOString(),
          duration_ms: Number(trace.duration_ms ?? 0),
        }))),
      });
    }

    const citations = result.citations ?? result.evidence_refs ?? [];
    await data("agent_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        { user_id: userId, run_id: run.id, sequence_no: 0, role: "user", agent_name: "career_supervisor", content: JSON.stringify(input), citations: [] },
        { user_id: userId, run_id: run.id, sequence_no: 1, role: "assistant", agent_name: state.next_agent ?? "career_agent", content: JSON.stringify(result), citations: safeJson(citations) },
      ]),
    });

    const updated = await data<Row[]>(`agent_runs?id=eq.${enc(run.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: state.requires_human ? "waiting_for_human" : "completed",
        output: safeJson(result),
        confidence: Number(state.confidence ?? 0),
        requires_human: Boolean(state.requires_human),
        completed_at: state.requires_human ? null : new Date().toISOString(),
        duration_ms: Date.now() - started,
      }),
    });
    return { run: updated[0] ?? run, result, evaluation: evaluationRow ?? evaluation, traces, resume };
  } catch (error) {
    await data(`agent_runs?id=eq.${enc(run.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed", error_message: error instanceof Error ? error.message : "agent_failed", completed_at: new Date().toISOString(), duration_ms: Date.now() - started }),
    }).catch(() => undefined);
    throw error;
  }
}
