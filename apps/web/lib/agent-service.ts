import { buildCareerAgentGraph } from "@/lib/career-agent-graph.mjs";
import { buildDailyDispatchBatch } from "@/lib/dispatch-service";
import { embedTexts } from "@/lib/embedding-service";
import {
  MCP_TOOL_DEFINITIONS,
  buildDailyAgentReport,
  buildJobCitation,
  calculateRuleScore,
  extractJobSkills,
  generateResumeDraft,
  rankJobHybrid,
  rankJobsHybrid,
} from "@/lib/agent-runtime.mjs";

type Row = Record<string, any>;
export type AgentData = <T>(resource: string, init?: RequestInit) => Promise<T>;

function enc(value: unknown) { return encodeURIComponent(String(value ?? "")); }
function userQuery(userId: string) { return `user_id=eq.${enc(userId)}`; }

export async function loadAgentContext(data: AgentData, userId: string) {
  const profiles = await data<Row[]>(`profiles?select=*&${userQuery(userId)}&limit=1`);
  const profile = profiles[0] ?? null;
  const [jobs, applications, skillGaps, jobScores] = await Promise.all([
    data<Row[]>(`jobs?select=*&${userQuery(userId)}&order=updated_at.desc`),
    data<Row[]>(`applications?select=*&${userQuery(userId)}&order=updated_at.desc`),
    data<Row[]>(`skill_gaps?select=*&${userQuery(userId)}&order=severity.desc,updated_at.desc`),
    data<Row[]>(`job_scores?select=*&${userQuery(userId)}&order=final_score.desc`).catch(() => [] as Row[]),
  ]);
  const [evidence, resumes] = profile ? await Promise.all([
    data<Row[]>(`career_evidence?select=*&profile_id=eq.${enc(profile.id)}&active=eq.true&verification_status=eq.verified&order=confidence.desc`),
    data<Row[]>(`resume_versions?select=*&profile_id=eq.${enc(profile.id)}&order=updated_at.desc`),
  ]) : [[], []];
  return { jobs, profile, evidence, applications, skillGaps, resumes, jobScores };
}

function cosine(left: number[], right: number[]) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function grade(score: number) {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  return "C";
}

async function rankWithOptionalVectors(jobs: Row[], evidence: Row[], applications: Row[]) {
  const base = rankJobsHybrid(jobs, evidence, applications);
  const portfolio = evidence
    .map((item) => `${item.skill}\n${item.project}\n${item.evidence}`)
    .join("\n\n")
    .slice(0, 24000);
  if (!portfolio || !jobs.length) return { ranked: base, mode: "lexical" };
  try {
    const inputs = [
      portfolio,
      ...jobs.map((job) => `${job.title}\n${job.description ?? ""}\n${job.requirements ?? ""}`.slice(0, 24000)),
    ];
    const vectors = await embedTexts(inputs);
    const portfolioVector = vectors[0]?.embedding;
    if (!portfolioVector || vectors.slice(1).some((item) => !item.embedding)) {
      return { ranked: base, mode: "lexical" };
    }
    const byJob = new Map(base.map((item) => [String(item.job.id), item]));
    const adjusted = jobs.map((job, index) => {
      const current = byJob.get(String(job.id));
      const jobVector = vectors[index + 1]?.embedding;
      if (!current || !jobVector) return null;
      const semanticScore = Math.max(0, Math.min(100, Math.round(cosine(portfolioVector, jobVector) * 100)));
      let finalScore = Math.round(current.score.rule_score * 0.4 + semanticScore * 0.4 + current.score.history_score * 0.2);
      if (current.score.blockers?.length) finalScore = Math.min(finalScore, 49);
      return {
        job,
        score: {
          ...current.score,
          semantic_score: semanticScore,
          final_score: finalScore,
          grade: grade(finalScore),
          reasoning: [
            ...current.score.reasoning.filter((item: string) => !item.startsWith("Career Vault 语义重合分")),
            `OpenAI Embedding 语义相似度 ${semanticScore}`,
          ],
          model_version: "hybrid-vector-v1",
        },
      };
    }).filter(Boolean) as Array<{ job: Row; score: Row }>;
    adjusted.sort((a, b) => b.score.final_score - a.score.final_score);
    return { ranked: adjusted, mode: "vector" };
  } catch {
    return { ranked: base, mode: "lexical" };
  }
}


export function createAgentServices() {
  return {
    async rankJobs(input: Row, context: Row) {
      const limit = Math.max(1, Math.min(50, Number(input?.limit ?? 50)));
      const candidates = input?.job_id
        ? (context.jobs ?? []).filter((job: Row) => String(job.id) === String(input.job_id))
        : (context.jobs ?? []);
      const rankedResult = await rankWithOptionalVectors(candidates, context.evidence ?? [], context.applications ?? []);
      const ranked = rankedResult.ranked.slice(0, limit);
      return {
        ranked: ranked.map((item) => ({ ...item.score, job: item.job })),
        citations: ranked.flatMap((item) => item.score.citations).slice(0, 30),
        semantic_mode: rankedResult.mode,
        automatic_submission: false,
      };
    },
    async analyzeJob(input: Row, context: Row) {
      const job = (context.jobs ?? []).find((item: Row) => String(item.id) === String(input.job_id));
      if (!job) throw new Error("岗位不存在");
      const rule = calculateRuleScore(job, context.evidence ?? []);
      return {
        job_id: String(job.id),
        skills: extractJobSkills(job),
        hard_blockers: rule.blockers,
        confirmation_required: rule.needs_confirmation,
        matched_skills: rule.matched_skills,
        missing_skills: rule.missing_skills,
        citations: [buildJobCitation(job)],
        automatic_submission: false,
      };
    },
    async generateResume(input: Row, context: Row) {
      const job = (context.jobs ?? []).find((item: Row) => String(item.id) === String(input.job_id));
      if (!job) throw new Error("岗位不存在");
      const score = rankJobHybrid(job, context.evidence ?? [], context.applications ?? []);
      return generateResumeDraft({ persona: input.persona, job, evidence: context.evidence ?? [], score: score as any });
    },
    async dailyReport(_input: Row, context: Row) {
      const rankedResult = await rankWithOptionalVectors(context.jobs ?? [], context.evidence ?? [], context.applications ?? []);
      const report = buildDailyAgentReport(rankedResult.ranked, context.skillGaps ?? []);
      return {
        ...report,
        semantic_mode: rankedResult.mode,
        citations: rankedResult.ranked.slice(0, 8).flatMap((item) => item.score.citations).slice(0, 30),
      };
    },
    async mcpTool(input: Row, context: Row) {
      const tool = MCP_TOOL_DEFINITIONS.find((item) => item.name === input.tool_name);
      if (!tool) throw new Error("未知 MCP Tool");
      if (tool.accessMode === "approval_required") {
        return { tool: tool.name, approval_required: true, executed: false, reason: "必须回到 Career Copilot 完成独立人工确认" };
      }
      if (tool.name === "search_jobs") {
        const query = String(input.arguments?.query ?? "").toLowerCase();
        const rows = (context.jobs ?? []).filter((job: Row) => `${job.company_name} ${job.title} ${job.description}`.toLowerCase().includes(query)).slice(0, Number(input.arguments?.limit ?? 20));
        return { tool: tool.name, jobs: rows, citations: rows.map(buildJobCitation), approval_required: false };
      }
      if (tool.name === "analyze_job") {
        const job = (context.jobs ?? []).find((item: Row) => String(item.id) === String(input.arguments?.job_id));
        if (!job) throw new Error("岗位不存在");
        const rule = calculateRuleScore(job, context.evidence ?? []);
        return { job_id: String(job.id), skills: extractJobSkills(job), hard_blockers: rule.blockers, confirmation_required: rule.needs_confirmation, matched_skills: rule.matched_skills, missing_skills: rule.missing_skills, citations: [buildJobCitation(job)], automatic_submission: false };
      }
      if (tool.name === "rank_jobs") {
        const rankedResult = await rankWithOptionalVectors(context.jobs ?? [], context.evidence ?? [], context.applications ?? []);
        const ranked = rankedResult.ranked.slice(0, Math.max(1, Math.min(50, Number(input.arguments?.limit ?? 50))));
        return { tool: tool.name, ranked: ranked.map((item) => ({ ...item.score, job: item.job })), semantic_mode: rankedResult.mode, citations: ranked.flatMap((item) => item.score.citations).slice(0, 30), automatic_submission: false };
      }
      if (tool.name === "find_evidence") {
        const query = String(input.arguments?.query ?? "").toLowerCase();
        const rows = (context.evidence ?? []).filter((item: Row) => `${item.skill} ${item.project} ${item.evidence}`.toLowerCase().includes(query)).slice(0, Number(input.arguments?.limit ?? 10));
        return { tool: tool.name, evidence: rows, citations: rows.map((item: Row) => ({ type: "career_evidence", id: String(item.id), label: `${item.project} · ${item.skill}`, source_url: item.source_url ?? null })) };
      }
      if (tool.name === "list_resume_versions") return { tool: tool.name, resumes: context.resumes ?? [] };
      if (tool.name === "generate_resume_draft") {
        const job = (context.jobs ?? []).find((item: Row) => String(item.id) === String(input.arguments?.job_id));
        if (!job) throw new Error("岗位不存在");
        const score = rankJobHybrid(job, context.evidence ?? [], context.applications ?? []);
        return generateResumeDraft({ persona: input.arguments?.persona, job, evidence: context.evidence ?? [], score: score as any });
      }
      return { tool: tool.name, approval_required: false, result: null };
    },
  };
}

export async function runCareerAgent(taskType: string, input: Row, context: Row) {
  const graph = buildCareerAgentGraph(createAgentServices());
  return graph.invoke({ task_type: taskType, input, context, traces: [] });
}

export async function persistRankings(data: AgentData, userId: string, runId: string | null, ranked: Array<Row>) {
  if (!ranked.length) return [];
  const payload = ranked.map((item) => {
    const score = item.score ?? item;
    return {
      user_id: userId,
      job_id: score.job_id,
      run_id: runId,
      rule_score: score.rule_score,
      semantic_score: score.semantic_score,
      history_score: score.history_score,
      final_score: score.final_score,
      grade: score.grade,
      eligible: score.eligible,
      reasoning: score.reasoning,
      citations: score.citations,
      missing_skills: score.missing_skills,
      model_version: score.model_version,
      scored_at: new Date().toISOString(),
    };
  });
  return data<Row[]>("job_scores?on_conflict=user_id,job_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
  });
}

export async function runDailyAgentCycle({ data, userId }: { data: AgentData; userId: string }) {
  const startedAt = Date.now();
  const context = await loadAgentContext(data, userId);
  const runs = await data<Row[]>("agent_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      user_id: userId,
      agent_name: "career_supervisor",
      task_type: "daily_report",
      status: "running",
      subject_type: "daily_cycle",
      input: { source: "cron" },
      requires_human: false,
    }]),
  });
  const run = runs[0];
  try {
    const rankedResult = await rankWithOptionalVectors(context.jobs, context.evidence, context.applications);
    const ranked = rankedResult.ranked;
    await persistRankings(data, userId, run.id, ranked);
    const report = { ...buildDailyAgentReport(ranked, context.skillGaps), semantic_mode: rankedResult.mode };
    await data("daily_agent_reports?on_conflict=user_id,report_date", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{ user_id: userId, report_date: report.report_date, run_id: run.id, summary: report, ranked_job_ids: report.recommended_job_ids, skill_gaps: report.top_skill_gaps, updated_at: new Date().toISOString() }]),
    });
    const dispatchBatch = await buildDailyDispatchBatch({ data, userId, batchDate: report.report_date });
    await data(`agent_runs?id=eq.${enc(run.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed", output: { ...report, dispatch_batch: { id: dispatchBatch.batch.id, queued: dispatchBatch.dispatches.length } }, confidence: 0.88, completed_at: new Date().toISOString(), duration_ms: Date.now() - startedAt }),
    });
    return { status: "completed", run_id: run.id, report, ranked: ranked.length, dispatch_batch: { id: dispatchBatch.batch.id, queued: dispatchBatch.dispatches.length, reused: dispatchBatch.reused } };
  } catch (error) {
    await data(`agent_runs?id=eq.${enc(run.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed", error_message: error instanceof Error ? error.message : "agent_cycle_failed", completed_at: new Date().toISOString(), duration_ms: Date.now() - startedAt }),
    }).catch(() => undefined);
    throw error;
  }
}
