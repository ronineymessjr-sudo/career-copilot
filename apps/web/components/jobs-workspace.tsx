"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, FileText, Plus, RefreshCw, SearchCheck, Send, Sparkles } from "lucide-react";
import { controlFetch } from "@/lib/control-client";
import type { ApplicationPlan } from "@/lib/application-plan.mjs";

type Job = Record<string, any> & {
  id: string;
  company_name: string;
  title: string;
  evaluation?: Record<string, any> | null;
  application_package?: Record<string, any> | null;
  application?: Record<string, any> | null;
};

type PlanResponse = {
  plan: ApplicationPlan;
  application_package: Record<string, any> | null;
};

type PlanState = PlanResponse & { error?: string };

type HandoffResponse = {
  target_url: string;
  channel: string;
  mode: "browser_handoff";
  external_submission_performed: false;
};

function eligibility(job: Job) {
  const evaluation = job.evaluation ?? {};
  if (job.application?.status === "submitted") return { label: "已投递", tone: "done" };
  if (evaluation.eligible === false || job.accepts_2028 === false || job.accepts_students === false) return { label: "不建议", tone: "bad" };
  if (evaluation.needs_confirmation === true || job.accepts_2028 == null || job.days_per_week == null || job.minimum_months == null) return { label: "待核验", tone: "warn" };
  return { label: "可投", tone: "ok" };
}

function nextPreparationLink(items: string[]) {
  const text = items.join(" ");
  if (/证据|GitHub|代码|作品集|项目/.test(text)) return { href: "/career-vault", label: "补项目材料" };
  return { href: "/resumes", label: "完善简历" };
}

function PlanPanel({
  job,
  state,
  busyId,
  onVerify,
  onConfirm,
}: {
  job: Job;
  state: PlanState;
  busyId: string;
  onVerify: (job: Job) => Promise<void>;
  onConfirm: (job: Job, state: PlanState) => Promise<void>;
}) {
  const plan = state.plan;
  if (state.error) return <div className="focus-plan bad"><AlertTriangle size={13}/><span>{state.error}</span></div>;

  if (plan.status === "blocked") return <div className="focus-plan bad">
    <div><AlertTriangle size={13}/><strong>不建议投递</strong></div>
    <p>{plan.hard_blockers[0] ?? "岗位未通过硬性条件"}</p>
  </div>;

  if (plan.status === "needs_preparation") {
    const next = nextPreparationLink(plan.preparation_items);
    const needsVerification = plan.preparation_items.some((item) => /2028|出勤|实习|届|周期|核验/.test(item));
    return <div className="focus-plan warn">
      <div><FileText size={13}/><strong>先补齐再投</strong></div>
      <p>{plan.resume ? `${plan.resume.name} · 匹配 ${plan.resume.alignment_score}%` : "还没有可用简历"}</p>
      <ul>{plan.preparation_items.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="focus-plan-actions">
        {needsVerification ? <button className="ghost-button" type="button" onClick={() => void onVerify(job)}>补岗位条件</button> : null}
        <Link className="ghost-button" href={next.href}>{next.label}</Link>
      </div>
    </div>;
  }

  return <div className="focus-plan ok">
    <div><CheckCircle2 size={13}/><strong>已匹配最佳简历</strong></div>
    <p>{plan.resume?.name ?? "推荐简历"} · {plan.resume?.alignment_score ?? 0}%</p>
    <button className="primary-button" type="button" onClick={() => void onConfirm(job, state)} disabled={busyId === `submit-${job.id}`}>
      <Send size={13}/>{busyId === `submit-${job.id}` ? "正在连接…" : "确认并投递"}
    </button>
  </div>;
}

function JobRow({
  job,
  planState,
  busyId,
  onPlan,
  onVerify,
  onConfirm,
}: {
  job: Job;
  planState?: PlanState;
  busyId: string;
  onPlan: (job: Job) => Promise<void>;
  onVerify: (job: Job) => Promise<void>;
  onConfirm: (job: Job, state: PlanState) => Promise<void>;
}) {
  const evaluation = job.evaluation ?? {};
  const state = eligibility(job);
  const applicationStatus = String(job.application?.status ?? "");
  const planning = busyId === `plan-${job.id}`;
  const score = evaluation.total_score ?? "--";

  return <article className="focus-job-row">
    <div className="focus-job-score"><strong>{score}</strong><span>匹配</span></div>
    <div className="focus-job-copy">
      <span>{job.company_name || "待核验公司"}</span>
      <strong>{job.title}</strong>
      <small>{[job.city, job.workplace, job.salary].filter(Boolean).join(" · ") || "信息待核验"}</small>
    </div>
    <span className={`focus-status ${state.tone}`}>{state.label}</span>
    <div className="focus-job-action">
      {applicationStatus === "submitted" ? <span className="focus-complete">完成</span>
        : applicationStatus === "ready_to_submit" ? <Link className="primary-button" href="/applications">继续投递</Link>
          : <button className="primary-button" type="button" onClick={() => void onPlan(job)} disabled={planning || Boolean(busyId)}>
            <Send size={12}/>{planning ? "匹配中…" : "投这个"}
          </button>}
    </div>

    {planState ? <div className="focus-job-result"><PlanPanel job={job} state={planState} busyId={busyId} onVerify={onVerify} onConfirm={onConfirm}/></div> : null}
    <details className="focus-job-details">
      <summary><ChevronDown size={12}/>详情</summary>
      <div>
        <p>{job.requirements || job.description || "暂无完整岗位说明"}</p>
        {job.source_url ? <a href={job.source_url} target="_blank" rel="noreferrer">查看原岗位<ExternalLink size={11}/></a> : null}
      </div>
    </details>
  </article>;
}

export function JobsWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [plans, setPlans] = useState<Record<string, PlanState>>({});
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载岗位失败");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openJobs = useMemo(() => [...jobs]
    .filter((job) => String(job.status ?? "open") !== "archived")
    .sort((left, right) => Number(scores[String(right.id)]?.final_score ?? right.evaluation?.total_score ?? 0) - Number(scores[String(left.id)]?.final_score ?? left.evaluation?.total_score ?? 0)), [jobs, scores]);

  async function importJob(event: FormEvent) {
    event.preventDefault();
    setBusyId("import");
    try {
      await controlFetch("/api/control/jobs", { method: "POST", body: JSON.stringify(form) });
      setForm({ company: "", title: "", source_url: "", source_reliability: 3, raw_text: "" });
      setMessage("岗位已导入。请选择“投这个”，系统会自动匹配简历。 ");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败");
    } finally {
      setBusyId("");
    }
  }

  async function plan(job: Job) {
    setBusyId(`plan-${job.id}`);
    try {
      const result = await controlFetch<PlanResponse>(`/api/control/jobs/${job.id}/apply-plan`, { method: "POST" });
      setPlans((current) => ({ ...current, [job.id]: result }));
      setMessage(result.plan.status === "ready" ? `已为 ${job.company_name} 选出最合适的简历。` : "系统发现投递前需要补齐的内容。 ");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "匹配失败");
    } finally {
      setBusyId("");
    }
  }

  async function verify(job: Job) {
    const accepts2028 = window.prompt("是否接受 2028 届？输入：是 / 否 / 未知", job.accepts_2028 === true ? "是" : job.accepts_2028 === false ? "否" : "未知");
    if (accepts2028 === null) return;
    const days = window.prompt("每周最低出勤天数；未知填“未知”", job.days_per_week == null ? "未知" : String(job.days_per_week));
    if (days === null) return;
    const months = window.prompt("最短实习月数；未知填“未知”", job.minimum_months == null ? "未知" : String(job.minimum_months));
    if (months === null) return;
    const normalizeBoolean = (value: string) => ["是", "yes", "y", "true"].includes(value.trim().toLowerCase()) ? true : ["否", "no", "n", "false"].includes(value.trim().toLowerCase()) ? false : null;
    const normalizeNumber = (value: string) => value.trim() === "未知" || value.trim() === "" ? null : Number.parseInt(value.trim(), 10);
    setBusyId(`verify-${job.id}`);
    try {
      await controlFetch(`/api/control/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify({ accepts_2028: normalizeBoolean(accepts2028), accepts_students: true, days_per_week: normalizeNumber(days), minimum_months: normalizeNumber(months) }) });
      setPlans((current) => { const next = { ...current }; delete next[job.id]; return next; });
      await load();
      await plan(job);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "岗位条件保存失败");
    } finally {
      setBusyId("");
    }
  }

  async function confirmAndApply(job: Job, state: PlanState) {
    const pack = state.application_package;
    if (!pack?.id || state.plan.status !== "ready") return;
    if (!window.confirm(`使用“${state.plan.resume?.name ?? "推荐简历"}”投递：\n\n${job.company_name} · ${job.title}\n\n确认继续？`)) return;
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.title = "正在连接投递入口…";
      popup.document.body.textContent = "Career Copilot 正在验证材料与投递入口…";
    }
    setBusyId(`submit-${job.id}`);
    try {
      const approved = await controlFetch<{ application: Record<string, any> }>(`/api/control/approvals/${pack.id}`, {
        method: "POST",
        body: JSON.stringify({ decision: "approve", channel: job.channel, note: `用户选择投递；系统自动匹配 ${state.plan.resume?.name ?? "推荐简历"}` }),
      });
      const handoff = await controlFetch<HandoffResponse>(`/api/control/applications/${approved.application.id}/open-submission`, { method: "POST" });
      if (popup) popup.location.replace(handoff.target_url);
      else window.location.assign(handoff.target_url);
      setMessage("投递页已打开。平台要求登录或验证码时，只需在新页面完成该步骤。 ");
      await load();
    } catch (error) {
      popup?.close();
      setMessage(error instanceof Error ? error.message : "投递连接失败");
    } finally {
      setBusyId("");
    }
  }

  return <section className="focus-workspace">
    <header className="focus-workspace-head">
      <div><h1>推荐岗位</h1><p>系统找到 {openJobs.length} 个岗位。选择一个，其余步骤自动完成。</p></div>
      <button className="focus-icon-button" aria-label="刷新岗位" onClick={() => void load()}><RefreshCw size={14}/></button>
    </header>

    {message ? <div className="focus-message">{message}</div> : null}

    <div className="focus-job-list">
      {openJobs.length ? openJobs.map((job) => <JobRow key={job.id} job={job} planState={plans[job.id]} busyId={busyId} onPlan={plan} onVerify={verify} onConfirm={confirmAndApply}/>) : <div className="focus-empty"><SearchCheck size={18}/><span>暂无可选岗位</span></div>}
    </div>

    <details className="focus-import">
      <summary><Plus size={12}/>粘贴其它岗位</summary>
      <form onSubmit={importJob}>
        <div className="focus-import-grid">
          <label>公司<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="可留空"/></label>
          <label>岗位<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="可留空"/></label>
          <label className="wide">真实来源 URL<input type="url" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="官网或招聘平台链接" required/></label>
        </div>
        <label>完整 JD<textarea value={form.raw_text} onChange={(event) => setForm({ ...form, raw_text: event.target.value })} rows={5} required placeholder="粘贴职责、要求、地点、届别、出勤和周期…"/></label>
        <button className="primary-button" type="submit" disabled={busyId === "import"}><Sparkles size={13}/>{busyId === "import" ? "解析中…" : "导入"}</button>
      </form>
    </details>
  </section>;
}
