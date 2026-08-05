"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ExternalLink, FileText, Filter, Plus, RefreshCw, Search, SearchCheck, Send, SlidersHorizontal, X } from "lucide-react";
import { controlFetch } from "@/lib/control-client";
import type { ApplicationPlan } from "@/lib/application-plan.mjs";

type Job = Record<string, any> & {
  id: string;
  company_name: string;
  title: string;
  evaluation?: Record<string, any> | null;
  recommendation?: { score: number; fit: string; label: string; reasons: string[]; gaps: string[] } | null;
  application_package?: Record<string, any> | null;
  application?: Record<string, any> | null;
};

type PlanResponse = { plan: ApplicationPlan; application_package: Record<string, any> | null };
type PlanState = PlanResponse & { error?: string };
type FilterKey = "all" | "recommended" | "ready" | "verify" | "submitted";
type HandoffResponse = {
  target_url: string;
  channel: string;
  mode: "email_compose" | "link_handoff" | "direct_api";
  action_label: string;
  external_submission_performed: false;
  primary_copy_text?: string;
  material_kit_url: string;
  tailored_resume_url: string;
  answers_url: string;
  original_resume_url?: string | null;
  next_step: string;
};
type VerificationPatch = { accepts_2028: boolean | null; accepts_students: boolean | null; days_per_week: number | null; minimum_months: number | null };

function eligibility(job: Job) {
  const evaluation = job.evaluation ?? {};
  if (job.application?.status === "submitted") return { key: "submitted" as const, label: "已投递", tone: "done" };
  if (evaluation.eligible === false) return { key: "verify" as const, label: "条件不符", tone: "bad" };
  if (evaluation.needs_confirmation === true) return { key: "verify" as const, label: "需确认", tone: "warn" };
  return { key: "ready" as const, label: "可投递", tone: "ok" };
}

function nextPreparationLink(items: string[]) {
  const text = items.join(" ");
  if (/证据|GitHub|代码|作品集|项目/.test(text)) return { href: "/career-vault", label: "补项目证据" };
  return { href: "/resumes", label: "完善简历" };
}

function VerificationForm({ job, busyId, onSave }: { job: Job; busyId: string; onSave: (job: Job, patch: VerificationPatch) => Promise<void> }) {
  const [accepts2028, setAccepts2028] = useState(job.accepts_2028 === true ? "yes" : job.accepts_2028 === false ? "no" : "unknown");
  const [acceptsStudents, setAcceptsStudents] = useState(job.accepts_students === true ? "yes" : job.accepts_students === false ? "no" : "unknown");
  const [days, setDays] = useState(job.days_per_week == null ? "" : String(job.days_per_week));
  const [months, setMonths] = useState(job.minimum_months == null ? "" : String(job.minimum_months));
  const normalizeBoolean = (value: string) => value === "yes" ? true : value === "no" ? false : null;
  const normalizeNumber = (value: string) => value.trim() && Number.isFinite(Number.parseInt(value, 10)) ? Number.parseInt(value, 10) : null;

  return <details className="platform-inline-form">
    <summary>补岗位条件</summary>
    <form onSubmit={(event) => { event.preventDefault(); void onSave(job, { accepts_2028: normalizeBoolean(accepts2028), accepts_students: normalizeBoolean(acceptsStudents), days_per_week: normalizeNumber(days), minimum_months: normalizeNumber(months) }); }}>
      <div className="platform-inline-grid">
        <label>接受 2028 届<select value={accepts2028} onChange={(event) => setAccepts2028(event.target.value)}><option value="unknown">未知</option><option value="yes">是</option><option value="no">否</option></select></label>
        <label>接受在校生<select value={acceptsStudents} onChange={(event) => setAcceptsStudents(event.target.value)}><option value="unknown">未知</option><option value="yes">是</option><option value="no">否</option></select></label>
        <label>每周最低天数<input type="number" min="1" max="7" value={days} onChange={(event) => setDays(event.target.value)} placeholder="未知"/></label>
        <label>最短实习月数<input type="number" min="1" max="36" value={months} onChange={(event) => setMonths(event.target.value)} placeholder="未知"/></label>
      </div>
      <button className="ghost-button" type="submit" disabled={busyId === `verify-${job.id}`}>{busyId === `verify-${job.id}` ? "保存中…" : "保存并重新匹配"}</button>
    </form>
  </details>;
}

function PlanPanel({ job, state, busyId, onVerify, onConfirm }: { job: Job; state: PlanState; busyId: string; onVerify: (job: Job, patch: VerificationPatch) => Promise<void>; onConfirm: (job: Job, state: PlanState) => Promise<void> }) {
  const plan = state.plan;
  if (state.error) return <div className="platform-plan bad"><AlertTriangle size={17}/><span>{state.error}</span></div>;
  if (plan.status === "blocked") return <div className="platform-plan bad"><div><AlertTriangle size={17}/><strong>当前不能投递</strong></div><p>{plan.hard_blockers[0] ?? "岗位未通过硬性条件"}</p></div>;
  if (plan.status === "needs_preparation") {
    const verificationPattern = /2028|出勤|实习|届|周期|核验|在校生/;
    const needsVerification = plan.preparation_items.some((item) => verificationPattern.test(item));
    const materialItems = plan.preparation_items.filter((item) => !verificationPattern.test(item));
    const next = materialItems.length ? nextPreparationLink(materialItems) : null;
    return <div className="platform-plan warn">
      <div><FileText size={17}/><strong>先补齐再投</strong></div>
      <div className="platform-plan-summary"><span><small>最佳简历</small><strong>{plan.resume?.name ?? "尚无可用简历"}</strong></span>{plan.resume ? <span><small>匹配度</small><strong>{plan.resume.alignment_score}%</strong></span> : null}</div>
      <ul>{plan.preparation_items.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
      <div className="platform-plan-actions">{needsVerification ? <VerificationForm job={job} busyId={busyId} onSave={onVerify}/> : null}{next ? <Link className="ghost-button" href={next.href}>{next.label}</Link> : null}</div>
    </div>;
  }
  return <div className="platform-plan ok">
    <div><CheckCircle2 size={17}/><strong>定制简历和全部投递文案已生成</strong></div>
    <div className="platform-plan-summary three"><span><small>推荐简历</small><strong>{plan.resume?.name ?? "推荐简历"}</strong></span><span><small>匹配度</small><strong>{plan.resume?.alignment_score ?? 0}%</strong></span><span><small>投递方式</small><strong>{plan.submission_mode === "email_assisted" ? "邮件已预填" : "真实申请页面"}</strong></span></div>
    <button className="primary-button" type="button" onClick={() => void onConfirm(job, state)} disabled={busyId === `submit-${job.id}`}><Send size={16}/>{busyId === `submit-${job.id}` ? "准备中…" : "确认并去投递"}</button>
  </div>;
}

function JobRow({ job, planState, busyId, onPlan, onVerify, onConfirm }: { job: Job; planState?: PlanState; busyId: string; onPlan: (job: Job) => Promise<void>; onVerify: (job: Job, patch: VerificationPatch) => Promise<void>; onConfirm: (job: Job, state: PlanState) => Promise<void> }) {
  const state = eligibility(job);
  const applicationStatus = String(job.application?.status ?? "");
  const planning = busyId === `plan-${job.id}`;
  const recommendation = job.recommendation ?? { score: job.evaluation?.total_score ?? 0, fit: "possible", label: "待推荐", reasons: [], gaps: [] };
  const source = job.source_name || job.channel || "手动导入";

  return <article className="platform-job-row">
    <div className={`platform-job-score fit-${recommendation.fit}`}><strong>{recommendation.score ?? "--"}</strong><span>{recommendation.label}</span></div>
    <div className="platform-job-copy">
      <div className="platform-job-company"><span>{job.company_name || "待核验公司"}</span><em>{source}</em></div>
      <strong>{job.title}</strong>
      <small>{[job.city, job.district, job.workplace, job.salary].filter(Boolean).join(" · ") || "地点与薪资待确认"}</small>
      <div className="platform-reason-line">{recommendation.reasons?.slice(0, 2).map((reason: string) => <span key={reason}>{reason}</span>)}</div>
      <details className="platform-job-details"><summary><ChevronDown size={14}/>岗位详情与推荐解释</summary><div><p>{job.requirements || job.description || "暂无完整岗位说明"}</p>{recommendation.gaps?.length ? <section><strong>需要注意</strong><ul>{recommendation.gaps.slice(0, 4).map((gap: string) => <li key={gap}>{gap}</li>)}</ul></section> : null}{job.source_url ? <a href={job.source_url} target="_blank" rel="noreferrer">查看原岗位<ExternalLink size={14}/></a> : null}</div></details>
    </div>
    <span className={`platform-status ${state.tone}`}>{state.label}</span>
    <div className="platform-job-action">{applicationStatus === "submitted" ? <span className="platform-complete"><CheckCircle2 size={15}/>已完成</span> : applicationStatus === "ready_to_submit" ? <Link className="primary-button" href="/applications">继续投递</Link> : <button className="primary-button" type="button" onClick={() => void onPlan(job)} disabled={planning || Boolean(busyId)}><Send size={15}/>{planning ? "匹配中…" : "投这个"}</button>}</div>
    {planState ? <div className="platform-job-result"><PlanPanel job={job} state={planState} busyId={busyId} onVerify={onVerify} onConfirm={onConfirm}/></div> : null}
  </article>;
}

export function JobsWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pool, setPool] = useState<Record<string, any>>({});
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [plans, setPlans] = useState<Record<string, PlanState>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [sort, setSort] = useState("recommendation");
  const [form, setForm] = useState({ company: "", title: "", source_url: "", source_reliability: 3, raw_text: "" });

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<{ jobs: Job[]; pool: Record<string, any>; profile_completeness: { score: number } }>("/api/control/jobs");
      setJobs(result.jobs ?? []);
      setPool(result.pool ?? {});
      setProfileCompleteness(result.profile_completeness?.score ?? 0);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载岗位失败"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const openJobs = useMemo(() => jobs.filter((job) => String(job.status ?? "open") !== "archived"), [jobs]);
  const locations = useMemo(() => [...new Set(openJobs.flatMap((job) => [job.city, job.district]).filter(Boolean).map(String))].sort(), [openJobs]);
  const sources = useMemo(() => [...new Set(openJobs.map((job) => String(job.source_name || job.channel || "手动导入")))].sort(), [openJobs]);

  const counts = useMemo(() => openJobs.reduce((result, job) => {
    const key = eligibility(job).key;
    result.all += 1; result[key] += 1;
    if (Number(job.recommendation?.score ?? 0) >= 70) result.recommended += 1;
    return result;
  }, { all: 0, recommended: 0, ready: 0, verify: 0, submitted: 0 }), [openJobs]);

  const visibleJobs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = openJobs.filter((job) => {
      if (filter === "recommended" && Number(job.recommendation?.score ?? 0) < 70) return false;
      if (!["all", "recommended"].includes(filter) && eligibility(job).key !== filter) return false;
      if (needle && !`${job.company_name} ${job.title} ${job.description} ${job.requirements}`.toLowerCase().includes(needle)) return false;
      if (location && !`${job.city} ${job.district} ${job.address}`.includes(location)) return false;
      if (source && String(job.source_name || job.channel || "手动导入") !== source) return false;
      if (workplace && String(job.workplace) !== workplace) return false;
      return true;
    });
    return rows.sort((left, right) => {
      if (sort === "newest") return String(right.published_at || right.updated_at).localeCompare(String(left.published_at || left.updated_at));
      if (sort === "company") return String(left.company_name).localeCompare(String(right.company_name), "zh-CN");
      return Number(right.recommendation?.score ?? 0) - Number(left.recommendation?.score ?? 0);
    });
  }, [filter, location, openJobs, query, sort, source, workplace]);

  async function importJob(event: FormEvent) {
    event.preventDefault(); setBusyId("import");
    try { await controlFetch("/api/control/jobs", { method: "POST", body: JSON.stringify(form) }); setForm({ company: "", title: "", source_url: "", source_reliability: 3, raw_text: "" }); setMessage("岗位已导入完整岗位池，并按当前画像重新排序。"); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "导入失败"); }
    finally { setBusyId(""); }
  }

  async function plan(job: Job) {
    setBusyId(`plan-${job.id}`);
    try { const result = await controlFetch<PlanResponse>(`/api/control/jobs/${job.id}/apply-plan`, { method: "POST" }); setPlans((current) => ({ ...current, [job.id]: result })); setMessage(result.plan.status === "ready" ? `已为 ${job.company_name} 选出最合适的简历。` : "系统发现投递前需要补齐的内容。"); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "匹配失败"); }
    finally { setBusyId(""); }
  }

  async function verify(job: Job, patch: VerificationPatch) {
    setBusyId(`verify-${job.id}`);
    try { await controlFetch(`/api/control/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify(patch) }); setPlans((current) => { const next = { ...current }; delete next[job.id]; return next; }); await load(); await plan({ ...job, ...patch }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "岗位条件保存失败"); }
    finally { setBusyId(""); }
  }

  async function confirmAndApply(job: Job, state: PlanState) {
    const pack = state.application_package;
    if (!pack?.id || state.plan.status !== "ready") return;
    if (!window.confirm(`使用“${state.plan.resume?.name ?? "推荐简历"}”投递：\n\n${job.company_name} · ${job.title}\n\n确认继续？`)) return;
    const popup = window.open("about:blank", "_blank");
    if (popup) { popup.opener = null; popup.document.title = "正在连接投递入口…"; popup.document.body.textContent = "Career Copilot 正在验证材料与投递入口…"; }
    setBusyId(`submit-${job.id}`);
    try {
      const approved = await controlFetch<{ application: Record<string, any> }>(`/api/control/approvals/${pack.id}`, { method: "POST", body: JSON.stringify({ decision: "approve", channel: job.channel, note: `用户选择投递；系统自动匹配 ${state.plan.resume?.name ?? "推荐简历"}` }) });
      const handoff = await controlFetch<HandoffResponse>(`/api/control/applications/${approved.application.id}/open-submission`, { method: "POST" });
      if (handoff.primary_copy_text) {
        try { await navigator.clipboard.writeText(handoff.primary_copy_text); } catch { /* Clipboard permission may be unavailable. */ }
      }
      if (popup) popup.location.replace(handoff.target_url); else window.location.assign(handoff.target_url);
      setMessage(handoff.mode === "email_compose"
        ? "邮件草稿已打开，正文也已复制；检查收件人和附件后即可发送。"
        : "真实申请页面已打开，完整简历和文案保留在投递管理中，按需复制或下载后即可提交。");
      await load();
    } catch (error) { popup?.close(); setMessage(error instanceof Error ? error.message : "投递连接失败"); }
    finally { setBusyId(""); }
  }

  const filters: Array<[FilterKey, string, number]> = [["all", "全部岗位", counts.all], ["recommended", "为我推荐", counts.recommended], ["ready", "条件可投", counts.ready], ["verify", "需确认", counts.verify], ["submitted", "已投递", counts.submitted]];
  const hasActiveFilters = Boolean(query || location || source || workplace || filter !== "all");
  function resetFilters() { setFilter("all"); setQuery(""); setLocation(""); setSource(""); setWorkplace(""); setSort("recommendation"); }

  return <section className="platform-workspace">
    <header className="platform-page-head"><div><h1>岗位发现</h1><p>这里展示完整岗位池。画像只改变推荐顺序，不会把其他岗位从列表中删除。</p></div><button className="platform-refresh" onClick={() => void load()}><RefreshCw size={16}/>刷新岗位池</button></header>

    <section className="platform-pool-summary"><div><strong>{pool.total ?? openJobs.length}</strong><span>岗位总数</span></div><div><strong>{pool.sources ?? sources.length}</strong><span>岗位来源</span></div><div><strong>{counts.recommended}</strong><span>为我推荐</span></div><div><strong>{profileCompleteness}%</strong><span>画像完整度</span></div><Link href="/profile">调整推荐画像<SlidersHorizontal size={15}/></Link></section>

    {profileCompleteness < 70 ? <div className="platform-notice warn"><AlertTriangle size={18}/><span><strong>推荐画像还不完整</strong><small>完整岗位池仍然可浏览，但推荐排序可能不够准确。</small></span><Link href="/profile">完善画像</Link></div> : null}
    {message ? <div className="platform-message" role="status">{message}</div> : null}

    <section className="platform-job-controls">
      <div className="platform-filter-tabs" role="tablist">{filters.map(([key, label, count]) => <button key={key} role="tab" aria-selected={filter === key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}><span>{label}</span><strong>{count}</strong></button>)}</div>
      <div className="platform-search-row">
        <label className="platform-search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索岗位、公司或技能"/></label>
        <label><span>地点</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="">全部地点</option>{locations.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label><span>来源</span><select value={source} onChange={(event) => setSource(event.target.value)}><option value="">全部来源</option>{sources.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label><span>办公方式</span><select value={workplace} onChange={(event) => setWorkplace(event.target.value)}><option value="">全部方式</option><option value="remote">远程</option><option value="hybrid">混合</option><option value="onsite">现场</option><option value="unknown">待确认</option></select></label>
        <label><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommendation">推荐度</option><option value="newest">最新发布</option><option value="company">公司名称</option></select></label>
        {hasActiveFilters ? <button className="platform-clear-filter" onClick={resetFilters}><X size={15}/>清除</button> : null}
      </div>
    </section>

    <section className="platform-data-panel" aria-label="完整岗位池">
      <div className="platform-table-head platform-job-table-head"><span>推荐度</span><span>岗位与来源</span><span>资格状态</span><span>操作</span></div>
      <div className="platform-job-list">
        {visibleJobs.length ? visibleJobs.map((job) => <JobRow key={job.id} job={job} planState={plans[job.id]} busyId={busyId} onPlan={plan} onVerify={verify} onConfirm={confirmAndApply}/>) : openJobs.length ? <div className="platform-empty-state"><Filter size={22}/><strong>当前筛选没有结果</strong><p>岗位没有被删除，清除筛选即可查看完整岗位池。</p><button onClick={resetFilters}>查看全部岗位</button></div> : <div className="platform-empty-state"><SearchCheck size={22}/><strong>岗位池还是空的</strong><p>连接自动岗位来源，或者导入任意招聘平台的真实 JD。</p><div><Link href="/sources">连接岗位来源</Link></div></div>}
      </div>
    </section>

    <details className="platform-import" id="import-job"><summary><Plus size={16}/>从任意招聘平台导入岗位</summary><form onSubmit={importJob}><div className="platform-form-grid two"><label>公司<input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="可留空"/></label><label>岗位<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="可留空"/></label><label className="wide">真实来源 URL<input type="url" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="官网、BOSS、LinkedIn、实习僧、智联等真实链接" required/></label></div><label>完整 JD<textarea value={form.raw_text} onChange={(event) => setForm({ ...form, raw_text: event.target.value })} rows={7} required placeholder="粘贴职责、要求、地点、届别、出勤、周期和投递方式…"/></label><button className="primary-button" type="submit" disabled={busyId === "import"}>{busyId === "import" ? "解析中…" : "导入完整岗位池"}</button></form></details>
  </section>;
}
