"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Bot, Braces, CheckCircle2, FileText, Gauge, GitBranch, Play, RefreshCw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Row = Record<string, any>;

function pct(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? `${Math.round(number * (number <= 1 ? 100 : 1))}%` : "-";
}
function date(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(parsed) : value;
}

export function AgentDashboard() {
  const [runs, setRuns] = useState<Row[]>([]);
  const [scores, setScores] = useState<Row[]>([]);
  const [resumes, setResumes] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [evaluations, setEvaluations] = useState<Row[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [persona, setPersona] = useState("agent_engineer");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [agentPayload, scorePayload, resumePayload, jobPayload] = await Promise.all([
        controlFetch<{ runs: Row[]; evaluations: Row[] }>("/api/control/agents/run"),
        controlFetch<{ scores: Row[] }>("/api/control/ranking/jobs"),
        controlFetch<{ resumes: Row[] }>("/api/control/resumes"),
        controlFetch<{ jobs: Row[] }>("/api/control/jobs"),
      ]);
      setRuns(agentPayload.runs ?? []);
      setEvaluations(agentPayload.evaluations ?? []);
      setScores(scorePayload.scores ?? []);
      setResumes(resumePayload.resumes ?? []);
      setJobs(jobPayload.jobs ?? []);
      setSelectedJob((current) => current || String(jobPayload.jobs?.[0]?.id ?? ""));
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Agent 控制台加载失败"); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    completed: runs.filter((item) => item.status === "completed").length,
    failed: runs.filter((item) => item.status === "failed").length,
    sGrade: scores.filter((item) => item.grade === "S").length,
    grounded: evaluations.filter((item) => item.metrics?.grounded === true || item.status === "passed").length,
  }), [runs, scores, evaluations]);

  async function runTask(task: "rank" | "report") {
    setBusy(task);
    try {
      if (task === "rank") await controlFetch("/api/control/ranking/jobs", { method: "POST", body: JSON.stringify({ limit: 50 }) });
      else await controlFetch("/api/control/agents/run", { method: "POST", body: JSON.stringify({ task_type: "daily_report", input: {} }) });
      setMessage(task === "rank" ? "混合岗位评分已完成。" : "Agent 日报已生成；它只给出建议，不执行投递。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Agent 执行失败"); }
    finally { setBusy(""); }
  }

  async function generateResume(event: FormEvent) {
    event.preventDefault();
    if (!selectedJob) return;
    setBusy("resume");
    try {
      await controlFetch("/api/control/resumes", { method: "POST", body: JSON.stringify({ job_id: selectedJob, persona }) });
      setMessage("简历草稿已生成，只引用 verified Career Vault 证据。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "简历生成失败"); }
    finally { setBusy(""); }
  }

  return <section className="control-panel agent-center">
    <header className="control-heading"><div><span className="eyebrow">LangGraph · grounded agents · MCP</span><h2>Agent 运行中心</h2><p>运行可审计的岗位排序、简历草稿与评测。所有发送、提交、面试和 Offer 动作仍需独立确认。</p></div><button className="icon-button" onClick={() => void load()}><RefreshCw size={15}/></button></header>
    {message ? <div className="control-message">{message}</div> : null}

    <div className="agent-kpis">
      <article><Activity size={17}/><strong>{stats.completed}</strong><span>已完成运行</span></article>
      <article><Target size={17}/><strong>{stats.sGrade}</strong><span>S 级岗位</span></article>
      <article><ShieldCheck size={17}/><strong>{stats.grounded}</strong><span>通过评测</span></article>
      <article><Gauge size={17}/><strong>{stats.failed}</strong><span>失败运行</span></article>
    </div>

    <div className="agent-action-row">
      <button className="primary-button" disabled={Boolean(busy)} onClick={() => void runTask("rank")}><Play size={14}/>{busy === "rank" ? "评分中…" : "运行混合评分"}</button>
      <button className="ghost-button" disabled={Boolean(busy)} onClick={() => void runTask("report")}><Sparkles size={14}/>{busy === "report" ? "生成中…" : "生成 Agent 日报"}</button>
      <div className="mcp-proof"><Braces size={14}/><div><strong>Career MCP</strong><span>POST /api/mcp · Supabase Bearer Auth</span></div></div>
    </div>

    <div className="agent-grid">
      <div className="agent-column">
        <div className="panel-title"><Bot size={16}/><div><strong>岗位智能排序</strong><span>40% 规则 + 40% 证据重合 + 20% 历史反馈</span></div></div>
        <div className="agent-score-list">
          {scores.length === 0 ? <div className="empty-state compact"><Target size={22}/><strong>尚未生成混合评分</strong><span>运行评分后将展示等级、解释和引用。</span></div> : scores.slice(0, 12).map((item) => <article key={item.id}>
            <div className={`grade grade-${String(item.grade ?? "c").toLowerCase()}`}>{item.grade}</div>
            <div><span>{item.job?.company_name ?? "待核验公司"}</span><h3>{item.job?.title ?? item.job_id}</h3><p>{(item.reasoning ?? []).slice(0, 2).join("；")}</p><div className="score-parts"><span>规则 {item.rule_score}</span><span>语义 {item.semantic_score}</span><span>历史 {item.history_score}</span></div></div>
            <strong>{item.final_score}</strong>
          </article>)}
        </div>
      </div>

      <div className="agent-column">
        <div className="panel-title"><GitBranch size={16}/><div><strong>Agent Trace</strong><span>Supervisor → 专用 Agent → Grounding Evaluator</span></div></div>
        <div className="trace-list">
          {runs.length === 0 ? <div className="empty-state compact"><GitBranch size={22}/><strong>暂无运行记录</strong><span>每个节点都会保存输入摘要、输出摘要和引用。</span></div> : runs.slice(0, 10).map((run) => <article key={run.id}>
            <header><div><strong>{run.task_type}</strong><span>{date(run.started_at)}</span></div><span className={`status ${run.status === "completed" ? "verified" : run.status === "failed" ? "bad" : "pending"}`}>{run.status}</span></header>
            <div className="trace-flow">{(run.traces ?? []).map((trace: Row, index: number) => <span key={trace.id ?? index}>{trace.node_name}</span>)}</div>
            <footer><span>置信度 {pct(run.confidence)}</span><span>耗时 {run.duration_ms ?? 0}ms</span><span>人工节点 {run.requires_human ? "是" : "否"}</span></footer>
          </article>)}
        </div>
      </div>
    </div>

    <div className="agent-lower-grid">
      <form className="agent-resume-form" onSubmit={generateResume}>
        <div className="panel-title"><FileText size={16}/><div><strong>Resume Agent</strong><span>多种岗位版本，只使用已核验证据</span></div></div>
        <label>目标岗位<select value={selectedJob} onChange={(event) => setSelectedJob(event.target.value)} required><option value="">选择岗位</option>{jobs.map((job) => <option value={job.id} key={job.id}>{job.company_name} · {job.title}</option>)}</select></label>
        <label>简历 Persona<select value={persona} onChange={(event) => setPersona(event.target.value)}><option value="agent_engineer">工程研发版</option><option value="ai_product">产品与运营版</option><option value="ai_solution">解决方案与商务版</option><option value="local_transition">通用岗位版</option></select></label>
        <button className="primary-button" disabled={!selectedJob || Boolean(busy)}><Sparkles size={14}/>{busy === "resume" ? "生成中…" : "生成可审计草稿"}</button>
      </form>

      <div className="agent-resume-list">
        <div className="panel-title"><FileText size={16}/><div><strong>最新简历版本</strong><span>草稿不等于投递材料已批准</span></div></div>
        {resumes.length === 0 ? <div className="empty-state compact"><FileText size={22}/><strong>暂无 Agent 简历</strong></div> : resumes.slice(0, 8).map((resume) => <article key={resume.id}><div><strong>{resume.name}</strong><span>v{resume.version_no} · {resume.status}</span></div><span>{resume.alignment?.alignment_score ?? resume.alignment_summary?.score ?? 0} 分</span></article>)}
      </div>

      <div className="agent-evaluation-list">
        <div className="panel-title"><CheckCircle2 size={16}/><div><strong>Evaluation</strong><span>引用覆盖、Grounding 与幻觉检查</span></div></div>
        {evaluations.length === 0 ? <div className="empty-state compact"><CheckCircle2 size={22}/><strong>暂无评测记录</strong></div> : evaluations.slice(0, 8).map((item) => <article key={item.id}><div><strong>{item.evaluation_type}</strong><span>{date(item.created_at)}</span></div><span className={`status ${item.status === "passed" ? "verified" : "bad"}`}>{item.status}</span><small>引用覆盖 {pct(item.metrics?.citation_coverage ?? 0)}</small></article>)}
      </div>
    </div>
  </section>;
}
