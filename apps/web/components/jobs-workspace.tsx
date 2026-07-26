"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, ClipboardCheck, ExternalLink, FilePlus2, RefreshCw, SearchCheck, ShieldAlert, Sparkles } from "lucide-react";
import { controlFetch } from "@/lib/control-client";
import { buildGreetingDraft, recommendResumePersona, RESUME_PERSONAS } from "@/lib/agent-runtime.mjs";

type Job = Record<string, any> & {
  id: string;
  company_name: string;
  title: string;
  evaluation?: Record<string, any> | null;
  application_package?: Record<string, any> | null;
  application?: Record<string, any> | null;
};

function answerBoolean(label: string, current: boolean | null | undefined): boolean | null | undefined {
  const initial = current === true ? "是" : current === false ? "否" : "";
  const value = window.prompt(`${label}\n请输入：是 / 否 / 未知。只有从可靠来源确认后才填写。`, initial);
  if (value === null || value.trim() === "") return undefined;
  if (["是", "yes", "y", "true"].includes(value.trim().toLowerCase())) return true;
  if (["否", "no", "n", "false"].includes(value.trim().toLowerCase())) return false;
  return null;
}

function answerNumber(label: string, current: number | null | undefined): number | null | undefined {
  const value = window.prompt(`${label}\n请输入数字；仍未知可输入“未知”。`, current == null ? "" : String(current));
  if (value === null || value.trim() === "") return undefined;
  if (value.trim() === "未知") return null;
  const number = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(number)) throw new Error(`${label}必须是数字或“未知”`);
  return number;
}

export function JobsWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ company: "", title: "", source_url: "", source_reliability: 3, raw_text: "" });

  const load = useCallback(async () => {
    try {
      const [result, scoreResult] = await Promise.all([
        controlFetch<{ jobs: Job[] }>("/api/control/jobs"),
        controlFetch<{ scores: Array<Record<string, any>> }>("/api/control/ranking/jobs").catch(() => ({ scores: [] })),
      ]);
      setJobs(result.jobs ?? []);
      setScores(Object.fromEntries((scoreResult.scores ?? []).map((item) => [String(item.job_id), item])));
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载岗位失败"); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function importJob(event: FormEvent) {
    event.preventDefault();
    setBusyId("import");
    try {
      await controlFetch("/api/control/jobs", { method: "POST", body: JSON.stringify(form) });
      setForm({ company: "", title: "", source_url: "", source_reliability: 3, raw_text: "" });
      setMessage("岗位已导入。下一步请评分并核验 HR 条件。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "导入失败"); }
    finally { setBusyId(""); }
  }

  async function action(job: Job, name: "evaluate" | "prepare") {
    setBusyId(`${name}-${job.id}`);
    try {
      await controlFetch(`/api/control/jobs/${job.id}/${name}`, { method: "POST" });
      setMessage(name === "evaluate" ? "评分完成。" : "材料包已生成，等待真实性审批。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作失败"); }
    finally { setBusyId(""); }
  }

  async function approve(job: Job) {
    const pack = job.application_package;
    if (!pack) return;
    if (!window.confirm("确认材料中的每条经历都来自 Career Vault 的真实证据，并允许进入 READY_TO_SUBMIT？\n这不会自动向招聘平台提交。")) return;
    setBusyId(`approve-${job.id}`);
    try {
      await controlFetch(`/api/control/approvals/${pack.id}`, {
        method: "POST",
        body: JSON.stringify({ decision: "approve", channel: job.channel, note: "用户完成真实性审批" }),
      });
      setMessage("材料已批准，岗位进入待提交。系统仍不会自动提交。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "审批失败"); }
    finally { setBusyId(""); }
  }

  async function recordHrResult(job: Job) {
    try {
      const patch: Record<string, unknown> = {};
      const acceptsStudents = answerBoolean("是否确认接受在校生？", job.accepts_students);
      const accepts2028 = answerBoolean("是否确认接受 2028 届？", job.accepts_2028);
      const days = answerNumber("每周最低出勤天数", job.days_per_week);
      const months = answerNumber("最短实习月数", job.minimum_months);
      if (acceptsStudents !== undefined) patch.accepts_students = acceptsStudents;
      if (accepts2028 !== undefined) patch.accepts_2028 = accepts2028;
      if (days !== undefined) patch.days_per_week = days;
      if (months !== undefined) patch.minimum_months = months;
      if (Object.keys(patch).length === 0) return;
      setBusyId(`verify-${job.id}`);
      await controlFetch(`/api/control/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await controlFetch(`/api/control/jobs/${job.id}/evaluate`, { method: "POST" });
      setMessage("HR 条件已记录并重新评分。填写内容应能追溯到聊天、官网或可靠 JD。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "核验结果保存失败"); }
    finally { setBusyId(""); }
  }

  return <div className="control-grid jobs-layout">
    <section className="control-panel jobs-panel">
      <header className="control-heading"><div><span className="eyebrow">Deterministic intake</span><h2>岗位发现与资格核验</h2><p>2028 届、在校资格、出勤和周期未知时，系统不会放行。</p></div><button className="icon-button" onClick={()=>void load()}><RefreshCw size={15}/></button></header>
      {message ? <div className="control-message">{message}</div> : null}
      <div className="live-job-list">
        {jobs.length === 0 ? <div className="empty-state"><SearchCheck size={25}/><strong>暂无正式岗位</strong><span>粘贴一条完整 JD，系统会先做确定性解析，再由你补充 HR 核验结果。</span></div> : jobs.map((job) => {
          const evaluation = job.evaluation;
          const breakdown = evaluation?.score_breakdown ?? {};
          const questions: string[] = breakdown.confirmation_questions ?? [];
          const hardReasons: string[] = breakdown.hard_filter_reasons ?? [];
          const hybridScore = scores[String(job.id)] ?? null;
          const recommendedPersona = String((recommendResumePersona as any)(job, hybridScore));
          const personaConfig = RESUME_PERSONAS[recommendedPersona as keyof typeof RESUME_PERSONAS] ?? RESUME_PERSONAS.agent_engineer;
          const greetingDraft = (buildGreetingDraft as any)({ job, score: hybridScore, persona: recommendedPersona });
          return <article className="control-job-card" key={job.id}>
            <div className="control-job-head">
              <div className={`grade grade-${String(evaluation?.grade ?? "c").toLowerCase()}`}>{evaluation?.grade ?? "?"}</div>
              <div><span>{job.company_name || "待核验公司"}</span><h3>{job.title}</h3><p>{[job.workplace, job.city, job.district, job.salary].filter(Boolean).join(" · ") || "地点与薪资待核验"}</p></div>
              <div className="control-score"><strong>{evaluation?.total_score ?? "--"}</strong><span>匹配分</span></div>
            </div>
            <div className="job-status-strip">
              <span className={job.accepts_2028 === true ? "ok" : job.accepts_2028 === false ? "bad" : "warn"}>2028届 {job.accepts_2028 === true ? "✓" : job.accepts_2028 === false ? "×" : "待确认"}</span>
              <span className={job.accepts_students === true ? "ok" : job.accepts_students === false ? "bad" : "warn"}>在校生 {job.accepts_students === true ? "✓" : job.accepts_students === false ? "×" : "待确认"}</span>
              <span className={Number(job.days_per_week) >= 3 ? "ok" : "warn"}>每周 {job.days_per_week ?? "?"} 天</span>
              <span className={Number(job.minimum_months) >= 3 ? "ok" : "warn"}>至少 {job.minimum_months ?? "?"} 月</span>
            </div>
            {hardReasons.length ? <div className="blocker-box"><ShieldAlert size={15}/><div><strong>硬性阻断</strong><p>{hardReasons.join("；")}</p></div></div> : null}
            {questions.length ? <div className="blocker-box warning"><ClipboardCheck size={15}/><div><strong>需要向 HR 核验</strong><p>{questions.join("；")}</p></div></div> : null}
            {evaluation?.matched_skills?.length ? <div className="tag-row">{evaluation.matched_skills.map((skill: string)=><span key={skill}>{skill}</span>)}</div> : null}
            <div className="job-prep-box">
              <header><div><span>Agent 投递准备</span><strong>{personaConfig.label}</strong></div><span>{hybridScore ? `${hybridScore.grade} · ${hybridScore.final_score}分` : "待运行混合评分"}</span></header>
              <p>{greetingDraft.greeting}</p>
              <footer><small>状态：等待人工确认 · 不自动发送</small><button className="ghost-button" type="button" onClick={() => void navigator.clipboard.writeText(greetingDraft.greeting)}>复制招呼语</button></footer>
            </div>
            {job.application_package ? <div className="package-preview"><span>材料版本：{job.application_package.resume_version_name}</span><p>{job.application_package.greeting}</p><small>真实性：{job.application_package.truth_check?.passed ? "通过" : "阻断"} · 审批：{job.application_package.approval}</small></div> : null}
            <footer className="card-actions">
              <button className="ghost-button" onClick={()=>void recordHrResult(job)} disabled={Boolean(busyId)}><ClipboardCheck size={14}/>录入 HR 结果</button>
              <button className="ghost-button" onClick={()=>void action(job,"evaluate")} disabled={Boolean(busyId)}><SearchCheck size={14}/>评分</button>
              <button className="ghost-button" onClick={()=>void action(job,"prepare")} disabled={!evaluation?.eligible || Boolean(busyId)}><FilePlus2 size={14}/>生成材料</button>
              {job.application_package?.approval === "pending" ? <button className="primary-button" onClick={()=>void approve(job)} disabled={Boolean(busyId)}><Check size={14}/>真实性审批</button> : null}
              {job.source_url ? <a className="link-button" href={job.source_url} target="_blank" rel="noreferrer">原始来源<ExternalLink size={13}/></a> : null}
            </footer>
          </article>;
        })}
      </div>
    </section>

    <form className="control-panel control-form sticky-panel" onSubmit={importJob}>
      <div><span className="eyebrow">Import job</span><h2>粘贴一条真实 JD</h2><p>保留原文和来源，未知字段不会被模型补全。</p></div>
      <label>公司（可选）<input value={form.company} onChange={(e)=>setForm({...form,company:e.target.value})} placeholder="原文可识别时可留空"/></label>
      <label>岗位名称（可选）<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="例如 AI Agent 后端实习生"/></label>
      <label>可靠来源 URL<input type="url" value={form.source_url} onChange={(e)=>setForm({...form,source_url:e.target.value})} placeholder="官网、BOSS、牛客等"/></label>
      <label>来源可靠度<select value={form.source_reliability} onChange={(e)=>setForm({...form,source_reliability:Number(e.target.value)})}>{[1,2,3,4,5].map((value)=><option value={value} key={value}>{value}/5</option>)}</select></label>
      <label>完整 JD 原文<textarea value={form.raw_text} onChange={(e)=>setForm({...form,raw_text:e.target.value})} rows={14} required placeholder="粘贴职责、要求、地点、出勤、周期、届别和投递方式…"/></label>
      <button className="primary-button" type="submit" disabled={busyId === "import"}><Sparkles size={15}/>{busyId === "import" ? "解析中…" : "导入并解析"}</button>
    </form>
  </div>;
}
