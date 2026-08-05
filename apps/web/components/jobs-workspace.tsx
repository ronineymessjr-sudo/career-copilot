"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, FileText, Plus, RefreshCw, SearchCheck, Send } from "lucide-react";
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
type FilterKey = "all" | "ready" | "verify" | "submitted";

type HandoffResponse = {
  target_url: string;
  channel: string;
  mode: "browser_handoff";
  external_submission_performed: false;
};

type VerificationPatch = {
  accepts_2028: boolean | null;
  accepts_students: boolean | null;
  days_per_week: number | null;
  minimum_months: number | null;
};

function eligibility(job: Job) {
  const evaluation = job.evaluation ?? {};
  if (job.application?.status === "submitted") return { key: "submitted" as const, label: "已投递", tone: "done" };
  if (evaluation.eligible === false || job.accepts_2028 === false || job.accepts_students === false) return { key: "verify" as const, label: "不建议", tone: "bad" };
  if (evaluation.needs_confirmation === true || job.accepts_2028 == null || job.days_per_week == null || job.minimum_months == null) return { key: "verify" as const, label: "需确认", tone: "warn" };
  return { key: "ready" as const, label: "可投递", tone: "ok" };
}

function nextPreparationLink(items: string[]) {
  const text = items.join(" ");
  if (/证据|GitHub|代码|作品集|项目/.test(text)) return { href: "/career-vault", label: "补项目材料" };
  return { href: "/resumes", label: "完善简历" };
}

function VerificationForm({
  job,
  busyId,
  onSave,
}: {
  job: Job;
  busyId: string;
  onSave: (job: Job, patch: VerificationPatch) => Promise<void>;
}) {
  const [accepts2028, setAccepts2028] = useState(job.accepts_2028 === true ? "yes" : job.accepts_2028 === false ? "no" : "unknown");
  const [acceptsStudents, setAcceptsStudents] = useState(job.accepts_students === true ? "yes" : job.accepts_students === false ? "no" : "unknown");
  const [days, setDays] = useState(job.days_per_week == null ? "" : String(job.days_per_week));
  const [months, setMonths] = useState(job.minimum_months == null ? "" : String(job.minimum_months));

  const normalizeBoolean = (value: string) => value === "yes" ? true : value === "no" ? false : null;
  const normalizeNumber = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return <details className="focus-verify-form">
    <summary>补岗位条件</summary>
    <form onSubmit={(event) => {
      event.preventDefault();
      void onSave(job, {
        accepts_2028: normalizeBoolean(accepts2028),
        accepts_students: normalizeBoolean(acceptsStudents),
        days_per_week: normalizeNumber(days),
        minimum_months: normalizeNumber(months),
      });
    }}>
      <div className="focus-verify-grid">
        <label>接受 2028 届
          <select value={accepts2028} onChange={(event) => setAccepts2028(event.target.value)}>
            <option value="unknown">未知</option><option value="yes">是</option><option value="no">否</option>
          </select>
        </label>
        <label>接受在校生
          <select value={acceptsStudents} onChange={(event) => setAcceptsStudents(event.target.value)}>
            <option value="unknown">未知</option><option value="yes">是</option><option value="no">否</option>
          </select>
        </label>
        <label>每周最低天数<input type="number" min="1" max="7" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} placeholder="未知"/></label>
        <label>最短实习月数<input type="number" min="1" max="24" inputMode="numeric" value={months} onChange={(event) => setMonths(event.target.value)} placeholder="未知"/></label>
      </div>
      <button className="ghost-button" type="submit" disabled={busyId === `verify-${job.id}`}>{busyId === `verify-${job.id}` ? "保存中…" : "保存并重新匹配"}</button>
    </form>
  </details>;
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
  onVerify: (job: Job, patch: VerificationPatch) => Promise<void>;
  onConfirm: (job: Job, state: PlanState) => Promise<void>;
}) {
  const plan = state.plan;
  if (state.error) return <div className="focus-plan bad"><AlertTriangle size={17}/><span>{state.error}</span></div>;

  if (plan.status === "blocked") return <div className="focus-plan bad">
    <div><AlertTriangle size={17}/><strong>暂不建议投递</strong></div>
    <p>{plan.hard_blockers[0] ?? "岗位未通过硬性条件"}</p>
  </div>;

  if (plan.status === "needs_preparation") {
    const verificationPattern = /2028|出勤|实习|届|周期|核验|在校生/;
    const needsVerification = plan.preparation_items.some((item) => verificationPattern.test(item));
    const materialItems = plan.preparation_items.filter((item) => !verificationPattern.test(item));
    const next = materialItems.length ? nextPreparationLink(materialItems) : null;
    return <div className="focus-plan warn">
      <div><FileText size={17}/><strong>需要补齐</strong></div>
      <div className="focus-plan-inline single">
        <span><small>当前最佳简历</small><strong>{plan.resume?.name ?? "尚无可用简历"}</strong></span>
        {plan.resume ? <span><small>匹配度</small><strong>{plan.resume.alignment_score}%</strong></span> : null}
      </div>
      <ul>{plan.preparation_items.slice(0, 2).map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="focus-plan-actions">
        {needsVerification ? <VerificationForm job={job} busyId={busyId} onSave={onVerify}/> : null}
        {next ? <Link className="ghost-button" href={next.href}>{next.label}</Link> : null}
      </div>
    </div>;
  }

  return <div className="focus-plan ok">
    <div><CheckCircle2 size={17}/><strong>材料已准备</strong></div>
    <div className="focus-plan-inline">
      <span><small>推荐简历</small><strong>{plan.resume?.name ?? "推荐简历"}</strong></span>
      <span><small>匹配度</small><strong>{plan.resume?.alignment_score ?? 0}%</strong></span>
      <span><small>方式</small><strong>{plan.submission_mode === "email_assisted" ? "邮件" : "招聘平台"}</strong></span>
    </div>
    <button className="primary-button" type="button" onClick={() => void onConfirm(job, state)} disabled={busyId === `submit-${job.id}`}>
      <Send size={16}/>{busyId === `submit-${job.id}` ? "正在连接…" : "确认并投递"}
    </button>
  </div>;
}

function JobRow({
  job,
  planState,
  rankingScore,
  busyId,
  onPlan,
  onVerify,
  onConfirm,
}: {
  job: Job;
  planState?: PlanState;
  rankingScore?: number | null;
  busyId: string;
  onPlan: (job: Job) => Promise<void>;
  onVerify: (job: Job, patch: VerificationPatch) => Promise<void>;
  onConfirm: (job: Job, state: PlanState) => Promise<void>;
}) {
  const evaluation = job.evaluation ?? {};
  const state = eligibility(job);
  const applicationStatus = String(job.application?.status ?? "");
  const planning = busyId === `plan-${job.id}`;
  const score = rankingScore ?? evaluation.total_score ?? "--";

  return <article className="focus-job-row">
    <div className="focus-job-score" aria-label={`匹配分 ${score}`}><strong>{score}</strong><span>匹配分</span></div>
    <div className="focus-job-copy">
      <span>{job.company_name || "待核验公司"}</span>
      <strong>{job.title}</strong>
      <small>{[job.city, job.workplace, job.salary].filter(Boolean).join(" · ") || "地点与薪资待确认"}</small>
      <details className="focus-job-details">
        <summary><ChevronDown size={14}/>详情</summary>
        <div>
          <p>{job.requirements || job.description || "暂无完整岗位说明"}</p>
          {job.source_url ? <a href={job.source_url} target="_blank" rel="noreferrer">查看原岗位<ExternalLink size={14}/></a> : null}
        </div>
      </details>
    </div>
    <span className={`focus-status ${state.tone}`}>{state.label}</span>
    <div className="focus-job-action">
      {applicationStatus === "submitted" ? <span className="focus-complete"><CheckCircle2 size={15}/>已完成</span>
        : applicationStatus === "ready_to_submit" ? <Link className="primary-button" href="/applications">继续投递</Link>
          : <button className="primary-button" type="button" onClick={() => void onPlan(job)} disabled={planning || Boolean(busyId)}>
            <Send size={15}/>{planning ? "匹配中…" : "投这个"}
          </button>}
    </div>

    {planState ? <div className="focus-job-result"><PlanPanel job={job} state={planState} busyId={busyId} onVerify={onVerify} onConfirm={onConfirm}/></div> : null}
  </article>;
}

export function JobsWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [plans, setPlans] = useState<Record<string, PlanState>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
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

  const counts = useMemo(() => openJobs.reduce((result, job) => {
    const key = eligibility(job).key;
    result.all += 1;
    result[key] += 1;
    return result;
  }, { all: 0, ready: 0, verify: 0, submitted: 0 }), [openJobs]);

  const visibleJobs = useMemo(() => filter === "all" ? openJobs : openJobs.filter((job) => eligibility(job).key === filter), [filter, openJobs]);

  async function importJob(event: FormEvent) {
    event.preventDefault();
    setBusyId("import");
    try {
      await controlFetch("/api/control/jobs", { method: "POST", body: JSON.stringify(form) });
      setForm({ company: "", title: "", source_url: "", source_reliability: 3, raw_text: "" });
      setMessage("岗位已导入。点击“投这个”，系统会自动检查条件并匹配简历。");
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
      setMessage(result.plan.status === "ready" ? `已为 ${job.company_name} 选出最合适的简历。` : "系统发现投递前需要补齐的内容。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "匹配失败");
    } finally {
      setBusyId("");
    }
  }

  async function verify(job: Job, patch: VerificationPatch) {
    setBusyId(`verify-${job.id}`);
    try {
      await controlFetch(`/api/control/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setPlans((current) => { const next = { ...current }; delete next[job.id]; return next; });
      await plan({ ...job, ...patch });
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
      setMessage("投递页已打开。平台要求登录或验证码时，只需在新页面完成该步骤。");
      await load();
    } catch (error) {
      popup?.close();
      setMessage(error instanceof Error ? error.message : "投递连接失败");
    } finally {
      setBusyId("");
    }
  }

  const filterItems: Array<[FilterKey, string, number]> = [
    ["all", "全部", counts.all],
    ["ready", "可投递", counts.ready],
    ["verify", "需处理", counts.verify],
    ["submitted", "已投递", counts.submitted],
  ];

  return <section className="focus-workspace">
    <header className="focus-workspace-head">
      <div><h1>岗位匹配</h1><p>选择一个岗位，系统会检查资格、匹配最佳简历，并在材料齐全后进入投递。</p></div>
      <button className="focus-refresh-button" aria-label="刷新岗位" onClick={() => void load()}><RefreshCw size={16}/><span>刷新</span></button>
    </header>

    <div className="focus-toolbar">
      <div className="focus-filter" role="tablist" aria-label="岗位筛选">
        {filterItems.map(([key, label, count]) => <button key={key} type="button" role="tab" aria-selected={filter === key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>
          <span>{label}</span><strong>{count}</strong>
        </button>)}
      </div>
      <span className="focus-sort-note">高匹配岗位优先</span>
    </div>

    {message ? <div className="focus-message" role="status" aria-live="polite">{message}</div> : null}

    <section className="focus-data-panel" aria-label="岗位列表">
      <div className="focus-table-head focus-job-table-head" aria-hidden="true">
        <span>匹配度</span><span>岗位</span><span>状态</span><span>操作</span>
      </div>
      <div className="focus-job-list">
        {visibleJobs.length ? visibleJobs.map((job) => <JobRow key={job.id} job={job} planState={plans[job.id]} rankingScore={Number(scores[String(job.id)]?.final_score ?? job.evaluation?.total_score ?? 0) || null} busyId={busyId} onPlan={plan} onVerify={verify} onConfirm={confirmAndApply}/>) : <div className="focus-empty"><SearchCheck size={21}/><span>这个分类里暂时没有岗位</span></div>}
      </div>
    </section>

    <details className="focus-import">
      <summary><Plus size={15}/>导入岗位</summary>
      <form onSubmit={importJob}>
        <div className="focus-import-grid">
          <label>公司<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="可留空"/></label>
          <label>岗位<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="可留空"/></label>
          <label className="wide">真实来源 URL<input type="url" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="官网或招聘平台链接" required/></label>
        </div>
        <label>完整 JD<textarea value={form.raw_text} onChange={(event) => setForm({ ...form, raw_text: event.target.value })} rows={6} required placeholder="粘贴职责、要求、地点、届别、出勤和周期…"/></label>
        <button className="primary-button" type="submit" disabled={busyId === "import"}>{busyId === "import" ? "解析中…" : "导入岗位"}</button>
      </form>
    </details>
  </section>;
}
