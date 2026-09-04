"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, CalendarClock, CheckCircle2, ChevronDown, ClipboardCheck, Copy, Download, Edit3, ExternalLink, FileText, History, Inbox, RefreshCw, Save, ShieldCheck, Sparkles } from "lucide-react";
import { controlDownload, controlFetch } from "@/lib/control-client";

type Application = Record<string, any>;
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
type AutomationPreference = {
  enabled: boolean;
  timezone: string;
  recommendation_limit: number;
  minimum_score: number;
  auto_prepare_enabled: boolean;
  auto_prepare_limit: number;
  require_profile_score: number;
};

function safeFilename(value: string, fallback: string) {
  const cleaned = value.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || fallback;
}

function CopyButton({ value, label = "复制" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <button type="button" className="kit-copy-button" onClick={() => void copy()} disabled={!value}><Copy size={13}/>{copied ? "已复制" : label}</button>;
}

function MaterialBlock({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return <article className="application-kit-block"><header><strong>{label}</strong><CopyButton value={value}/></header><p>{value}</p></article>;
}

function MaterialEditor({ item, onSaved }: { item: Application; onSaved: () => Promise<void> }) {
  const bundle = item.application_package?.content_bundle ?? {};
  const [form, setForm] = useState({
    greeting: String(bundle.greeting ?? item.application_package?.greeting ?? ""),
    cover_letter: String(bundle.cover_letter ?? ""),
    self_introduction: String(bundle.self_introduction ?? ""),
    why_role: String(bundle.why_role ?? ""),
    why_company: String(bundle.why_company ?? ""),
    project_answer: String(bundle.project_answer ?? ""),
    availability_answer: String(bundle.availability_answer ?? ""),
  });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  async function save() {
    setSaving(true);
    try { await controlFetch(`/api/control/applications/${item.id}/materials`, { method: "PATCH", body: JSON.stringify({ content_bundle: form, note }) }); await onSaved(); }
    finally { setSaving(false); }
  }
  return <details className="application-material-editor"><summary><Edit3 size={14}/>编辑并保存新版本</summary><div className="application-editor-grid">
    <label>招呼语<textarea rows={3} value={form.greeting} onChange={(event) => setForm({ ...form, greeting: event.target.value })}/></label>
    <label>求职信<textarea rows={7} value={form.cover_letter} onChange={(event) => setForm({ ...form, cover_letter: event.target.value })}/></label>
    <label>自我介绍<textarea rows={4} value={form.self_introduction} onChange={(event) => setForm({ ...form, self_introduction: event.target.value })}/></label>
    <label>为什么申请岗位<textarea rows={4} value={form.why_role} onChange={(event) => setForm({ ...form, why_role: event.target.value })}/></label>
    <label>为什么选择公司<textarea rows={4} value={form.why_company} onChange={(event) => setForm({ ...form, why_company: event.target.value })}/></label>
    <label>项目经历回答<textarea rows={5} value={form.project_answer} onChange={(event) => setForm({ ...form, project_answer: event.target.value })}/></label>
    <label>到岗时间回答<textarea rows={3} value={form.availability_answer} onChange={(event) => setForm({ ...form, availability_answer: event.target.value })}/></label>
    <label>版本说明<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：缩短求职信，突出数据分析项目"/></label>
    <button className="primary-button compact" type="button" onClick={() => void save()} disabled={saving}><Save size={14}/>{saving ? "保存中…" : "保存材料新版本"}</button>
  </div></details>;
}

const TRACKING_STATUSES = [
  ["prepared", "准备材料"], ["needs_information", "需要补齐"], ["ready_to_submit", "可以投递"], ["submitted", "已投递"],
  ["test", "收到笔试"], ["interview", "进入面试"], ["offer", "收到 Offer"], ["rejected", "被拒绝"], ["closed", "岗位已关闭"], ["paused", "已暂停"],
] as const;

function StatusTracker({ item, onSaved }: { item: Application; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState(String(item.status ?? "prepared"));
  const [reason, setReason] = useState(String(item.last_status_reason ?? ""));
  const [followUp, setFollowUp] = useState(item.next_follow_up_at ? String(item.next_follow_up_at).slice(0, 16) : "");
  const [note, setNote] = useState(String(item.follow_up_note ?? ""));
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await controlFetch(`/api/control/applications/${item.id}/status`, { method: "POST", body: JSON.stringify({ status, reason, next_follow_up_at: followUp ? new Date(followUp).toISOString() : null, follow_up_note: note }) }); await onSaved(); }
    finally { setSaving(false); }
  }
  return <details className="application-status-tracker"><summary><CalendarClock size={14}/>状态、跟进与历史</summary><div className="application-status-form">
    <label>当前状态<select value={status} onChange={(event) => setStatus(event.target.value)}>{TRACKING_STATUSES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label>状态说明<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="例如：已收到线上笔试邀请"/></label>
    <label>下次跟进时间<input type="datetime-local" value={followUp} onChange={(event) => setFollowUp(event.target.value)}/></label>
    <label>跟进备注<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="联系人、下一步和准备事项"/></label>
    <button className="ghost-button" type="button" onClick={() => void save()} disabled={saving}><Save size={14}/>{saving ? "保存中…" : "保存状态"}</button>
  </div>{Array.isArray(item.status_timeline) && item.status_timeline.length ? <div className="application-timeline"><strong><History size={14}/>状态历史</strong>{item.status_timeline.slice(-8).reverse().map((event: Record<string, any>, index: number) => <div key={`${event.at}-${index}`}><span>{event.label}</span><small>{event.reason || "用户状态更新"}</small><time>{event.at ? new Date(event.at).toLocaleString("zh-CN") : ""}</time></div>)}</div> : null}</details>;
}

function ApplicationMaterials({ item, onOpenExport, onSaved }: { item: Application; onOpenExport: (path: string, filename: string, open: boolean) => Promise<void>; onSaved: () => Promise<void> }) {
  const job = item.job ?? {};
  const pack = item.application_package ?? {};
  const bundle = pack.content_bundle ?? {};
  const answers = Array.isArray(bundle.common_answers) ? bundle.common_answers : [];
  const attachments = Array.isArray(bundle.attachments) ? bundle.attachments : [];
  const basename = safeFilename(`${job.company_name || "公司"}-${job.title || "岗位"}`, "application");
  const [layout, setLayout] = useState("standard");
  const layoutLabel = ({ standard: "标准单页", compact: "紧凑单页", portfolio: "作品集风格" } as Record<string, string>)[layout] || "标准单页";
  const openResume = () => void onOpenExport(`/api/control/applications/${item.id}/export?format=resume&layout=${layout}`, `${basename}-${layoutLabel}.html`, true);
  return <div className="application-kit-panel">
    <div className="application-kit-actions">
      <label className="kit-layout-picker">简历排版<select value={layout} onChange={(event) => setLayout(event.target.value)}><option value="standard">标准单页</option><option value="compact">紧凑单页</option><option value="portfolio">作品集风格</option></select></label>
      <button type="button" onClick={openResume}><FileText size={14}/>打开排版简历 / 保存 PDF</button>
      <button type="button" onClick={() => void onOpenExport(`/api/control/applications/${item.id}/export?format=docx`, `${basename}-定制简历.docx`, false)}><Download size={14}/>下载 DOCX</button>
      {pack.resume_version_id ? <button type="button" onClick={() => void onOpenExport(`/api/control/resumes/${pack.resume_version_id}/file`, pack.resume_filename || `${basename}-原始简历`, false)}><Download size={14}/>下载原始简历</button> : null}
      <button type="button" onClick={() => void onOpenExport(`/api/control/applications/${item.id}/export?format=kit`, `${basename}-投递材料.html`, true)}><ClipboardCheck size={14}/>打开完整材料包</button>
      <button type="button" onClick={() => void onOpenExport(`/api/control/applications/${item.id}/export?format=answers`, `${basename}-申请问答.md`, false)}><Download size={14}/>下载申请问答</button>
    </div>
    <div className="application-kit-grid">
      <MaterialBlock label="招呼语" value={String(bundle.greeting || pack.greeting || "")}/>
      <MaterialBlock label="求职信" value={String(bundle.cover_letter || "")}/>
      <MaterialBlock label="邮件主题" value={String(bundle.email_subject || pack.email_subject || "")}/>
      <MaterialBlock label="邮件正文" value={String(bundle.email_body || pack.email_body || "")}/>
      {answers.map((answer: Record<string, any>) => <MaterialBlock key={String(answer.key || answer.label)} label={String(answer.label || "申请回答")} value={String(answer.value || "")}/>)}
    </div>
    {attachments.length ? <section className="application-attachment-list"><strong>附件检查</strong><div>{attachments.map((attachment: Record<string, any>) => <span key={String(attachment.key)} className={attachment.key === "resume" || attachment.key === "cover_letter" ? "ready" : "check"}><CheckCircle2 size={13}/>{attachment.label}</span>)}</div></section> : null}
    <MaterialEditor item={item} onSaved={onSaved}/>
    <p className="application-kit-note">定制简历只使用已保存画像、已有简历和已核验项目证据，不会编造经历或数据。每次编辑都会保存独立版本；外部招聘平台的最终提交仍需要你确认。</p>
  </div>;
}

function ApplicationRow({ item, activeHandoffId, busyId, onStart, onConfirm, onApprove, onOpenExport, onReload }: { item: Application; activeHandoffId: string; busyId: string; onStart: (item: Application) => Promise<void>; onConfirm: (item: Application) => Promise<void>; onApprove: (item: Application) => Promise<void>; onOpenExport: (path: string, filename: string, open: boolean) => Promise<void>; onReload: () => Promise<void> }) {
  const job = item.job ?? {};
  const pack = item.application_package ?? {};
  const readiness = item.readiness ?? { blockers: [] };
  const capability = pack.submission_capability ?? pack.content_bundle?.submission_capability ?? item.submission ?? {};
  const ready = item.status === "ready_to_submit" && readiness.ready_to_submit === true;
  const opened = activeHandoffId === String(item.id);
  const canApprove = item.status !== "submitted" && pack.id && pack.approval === "pending" && pack.truth_check?.passed === true && item.evaluation?.eligible === true && item.evaluation?.needs_confirmation !== true;
  const actionLabel = capability.action_label || (capability.mode === "email_compose" ? "打开邮件投递" : "一键去投递");
  return <article className="platform-application-row application-row-r3">
    <div className="platform-application-job"><span>{job.company_name ?? "待核验公司"}</span><strong>{job.title ?? "岗位"}</strong><small>{[job.city, job.workplace, job.source_name || item.channel].filter(Boolean).join(" · ") || "岗位入口已准备"}</small></div>
    <div className="platform-application-resume"><span>已准备简历</span><strong>{pack.resume_version_name || "画像生成定制版"}</strong><small>{pack.truth_check?.application_plan?.resume_alignment_score != null ? `原始版本匹配度 ${pack.truth_check.application_plan.resume_alignment_score}% · 已生成定制内容` : "已生成岗位定制内容"}</small></div>
    <div className="platform-application-state">{ready ? <span className="platform-status ok">材料齐全</span> : item.status === "submitted" ? <span className="platform-status done">已投递</span> : canApprove ? <span className="platform-status warn">等待确认</span> : <span className="platform-status warn">需要补齐</span>}</div>
    <div className="platform-application-actions">
      {ready ? <><button className="primary-button" type="button" onClick={() => void onStart(item)} disabled={busyId === `open-${item.id}`}><ExternalLink size={15}/>{busyId === `open-${item.id}` ? "准备中…" : actionLabel}</button>{opened ? <button className="ghost-button" type="button" onClick={() => void onConfirm(item)} disabled={busyId === `confirm-${item.id}`}>确认已投递</button> : null}</>
        : item.status === "submitted" ? <small>{item.submitted_at ? new Date(item.submitted_at).toLocaleString("zh-CN") : "已确认"}{item.submitted_at && (Date.now() - new Date(item.submitted_at).getTime()) / 86400000 >= 10 ? <em className="quiet-reminder"> · 已安静 {Math.round((Date.now() - new Date(item.submitted_at).getTime()) / 86400000)} 天,建议跟进</em> : null}</small>
        : canApprove ? <button className="primary-button" type="button" onClick={() => void onApprove(item)} disabled={busyId === `approve-${item.id}`}><CheckCircle2 size={15}/>{busyId === `approve-${item.id}` ? "确认中…" : "确认材料并进入投递"}</button>
        : <Link className="ghost-button" href={`/jobs?job=${encodeURIComponent(String(job.id ?? ""))}`}>返回岗位处理</Link>}
    </div>
    {pack.id ? <details className="platform-application-details application-kit-details"><summary><ChevronDown size={14}/>查看简历与全部投递文案</summary><ApplicationMaterials item={item} onOpenExport={onOpenExport} onSaved={onReload}/></details> : readiness.blockers?.length ? <details className="platform-application-details"><summary><ChevronDown size={14}/>查看阻塞原因</summary><div><ul>{readiness.blockers.map((blocker: string) => <li key={blocker}>{blocker}</li>)}</ul></div></details> : null}
    <StatusTracker item={item} onSaved={onReload}/>
  </article>;
}

export function ApplicationsWorkspace() {
  const [items, setItems] = useState<Application[]>([]);
  const [automation, setAutomation] = useState<AutomationPreference | null>(null);
  const [latest, setLatest] = useState<Record<string, any> | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [activeHandoffId, setActiveHandoffId] = useState("");

  const load = useCallback(async () => {
    try {
      const [applications, automationPayload] = await Promise.all([
        controlFetch<{ applications: Application[] }>("/api/control/applications"),
        controlFetch<{ preference: AutomationPreference; latest: Record<string, any> | null }>("/api/control/automation").catch(() => ({ preference: null as any, latest: null })),
      ]);
      setItems(applications.applications ?? []);
      if (automationPayload.preference) setAutomation(automationPayload.preference);
      setLatest(automationPayload.latest ?? null);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载投递记录失败"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => ({
    ready: items.filter((item) => item.status === "ready_to_submit" && item.readiness?.ready_to_submit === true),
    submitted: items.filter((item) => item.status === "submitted").slice(0, 20),
    blocked: items.filter((item) => item.status !== "submitted" && !(item.status === "ready_to_submit" && item.readiness?.ready_to_submit === true)),
  }), [items]);

  async function openExport(path: string, filename: string, openInNewTab: boolean) {
    try { await controlDownload(path, filename, openInNewTab); }
    catch (error) { setMessage(error instanceof Error ? error.message : "材料打开失败"); }
  }

  async function startSubmission(item: Application) {
    const popup = window.open("about:blank", "_blank");
    if (popup) { popup.opener = null; popup.document.title = "正在准备投递…"; popup.document.body.textContent = "Career Copilot 正在准备简历、文案和真实投递入口…"; }
    setBusyId(`open-${item.id}`);
    try {
      const result = await controlFetch<HandoffResponse>(`/api/control/applications/${item.id}/open-submission`, { method: "POST" });
      if (result.primary_copy_text) await navigator.clipboard.writeText(result.primary_copy_text).catch(() => undefined);
      setActiveHandoffId(String(item.id));
      setMessage(result.mode === "email_compose" ? "邮件主题和正文已经填好；检查附件后发送。" : "招呼语已复制，真实申请页已经打开；简历和全部文案仍保留在工作台。");
      if (result.target_url.startsWith("mailto:")) {
        popup?.close();
        window.location.href = result.target_url;
      } else if (popup) popup.location.replace(result.target_url);
      else window.location.assign(result.target_url);
    } catch (error) { popup?.close(); setMessage(error instanceof Error ? error.message : "投递入口连接失败"); }
    finally { setBusyId(""); }
  }

  async function confirmSubmitted(item: Application) {
    const job = item.job ?? {};
    if (!window.confirm(`确认已经完成投递？\n\n${job.company_name ?? ""} · ${job.title ?? ""}`)) return;
    setBusyId(`confirm-${item.id}`);
    try { await controlFetch(`/api/control/applications/${item.id}/confirm-submission`, { method: "POST", body: JSON.stringify({ confirmed: true, note: "用户确认已在招聘平台或邮件渠道完成提交" }) }); setActiveHandoffId(""); setMessage("已记录为已投递。"); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "状态更新失败"); }
    finally { setBusyId(""); }
  }

  async function approve(item: Application) {
    const pack = item.application_package;
    if (!pack?.id) return;
    setBusyId(`approve-${item.id}`);
    try {
      await controlFetch(`/api/control/approvals/${pack.id}`, { method: "POST", body: JSON.stringify({ decision: "approve", channel: item.job?.channel || item.channel || "platform", note: "用户确认岗位定制简历与全部投递文案" }) });
      setMessage("材料已确认，现在可以一键打开投递渠道。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "确认失败"); }
    finally { setBusyId(""); }
  }

  async function saveAutomation() {
    if (!automation) return;
    setBusyId("automation-save");
    try {
      const result = await controlFetch<{ preference: AutomationPreference }>("/api/control/automation", { method: "PATCH", body: JSON.stringify(automation) });
      setAutomation(result.preference);
      setMessage("每日推荐与自动准备设置已保存。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "设置保存失败"); }
    finally { setBusyId(""); }
  }

  async function runNow() {
    setBusyId("automation-run");
    try {
      const result = await controlFetch<{ result: Record<string, any> }>("/api/control/automation", { method: "POST", body: JSON.stringify({ action: "run_now" }) });
      setMessage(`今日推荐已重新生成：推荐 ${result.result.recommended ?? 0} 个岗位，自动准备 ${result.result.prepared ?? 0} 个完整投递包。`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "今日推荐运行失败"); }
    finally { setBusyId(""); }
  }

  const rowProps = { activeHandoffId, busyId, onStart: startSubmission, onConfirm: confirmSubmitted, onApprove: approve, onOpenExport: openExport, onReload: load };
  return <section className="platform-workspace">
    <header className="platform-page-head"><div><h1>投递管理</h1><p>只看三类：可投递、待补齐、已完成。材料和真实投递入口集中在这里。</p></div><button className="platform-refresh" onClick={() => void load()}><RefreshCw size={16}/>刷新</button></header>

    <nav className="platform-priority-rail" aria-label="投递管理优先级">
      <Link className="platform-priority-item p0" href="#ready"><span>P0 · 现在做</span><strong>{groups.ready.length} 个可投递</strong><small>打开材料并确认后提交</small></Link>
      <Link className="platform-priority-item p1" href="#blocked"><span>P1 · 接着处理</span><strong>{groups.blocked.length} 个待补齐</strong><small>先补信息或确认岗位条件</small></Link>
      <Link className="platform-priority-item p2" href="#submitted-history"><span>P2 · 需要时看</span><strong>{groups.submitted.length} 个已完成</strong><small>复盘已投递记录</small></Link>
    </nav>

    <section className="platform-panel automation-panel">
      <header><Bot size={20}/><div><h2>每日推荐与完整投递包</h2><p>每天 08:00（亚洲时区）为每个账号独立生成推荐，并自动准备岗位定制简历与全部文案。</p></div><button className="ghost-button compact" type="button" onClick={() => void runNow()} disabled={busyId === "automation-run"}><Sparkles size={14}/>{busyId === "automation-run" ? "运行中…" : "立即生成今日推荐"}</button></header>
      {automation ? <details className="automation-settings-fold"><summary>调整每日推荐设置<ChevronDown size={14}/></summary><div className="automation-settings">
        <label className="platform-checkbox"><input type="checkbox" checked={automation.enabled} onChange={(event) => setAutomation({ ...automation, enabled: event.target.checked })}/>启用每日推荐</label>
        <label className="platform-checkbox"><input type="checkbox" checked={automation.auto_prepare_enabled} onChange={(event) => setAutomation({ ...automation, auto_prepare_enabled: event.target.checked })}/>自动生成简历和全部投递文案</label>
        <label>每日推荐数量<input type="number" min="1" max="30" value={automation.recommendation_limit} onChange={(event) => setAutomation({ ...automation, recommendation_limit: Number(event.target.value) })}/></label>
        <label>最低匹配分<input type="number" min="0" max="100" value={automation.minimum_score} onChange={(event) => setAutomation({ ...automation, minimum_score: Number(event.target.value) })}/></label>
        <label>每日自动准备上限<input type="number" min="0" max="10" value={automation.auto_prepare_limit} onChange={(event) => setAutomation({ ...automation, auto_prepare_limit: Number(event.target.value) })}/></label>
        <button className="primary-button compact" type="button" onClick={() => void saveAutomation()} disabled={busyId === "automation-save"}><Save size={14}/>{busyId === "automation-save" ? "保存中…" : "保存设置"}</button>
      </div></details> : null}
      <footer>{latest ? <span>最近生成：{latest.recommendation_date} · 推荐 {(latest.ranked_job_ids ?? []).length} 个 · 准备 {(latest.prepared_application_ids ?? []).length} 个</span> : <span>尚未生成个人每日推荐</span>}</footer>
    </section>

    <section className="platform-queue-summary"><article><strong>{groups.ready.length}</strong><span>材料齐全可投递</span></article><article><strong>{groups.blocked.length}</strong><span>等待确认或补齐</span></article><article><strong>{groups.submitted.length}</strong><span>最近已完成</span></article><Link href="/jobs">继续选岗位<ArrowRight size={15}/></Link></section>
    {message ? <div className="platform-message">{message}</div> : null}

    {!items.length ? <section className="platform-empty-guide"><Inbox size={26}/><h2>投递队列目前为空</h2><p>立即运行今日推荐，系统会自动选择岗位、匹配简历并生成完整投递包。</p><div><button className="primary-button" type="button" onClick={() => void runNow()}><Sparkles size={15}/>生成今日推荐</button><Link href="/jobs"><strong>浏览完整岗位池</strong><small>查看所有岗位并手动选择</small></Link><Link href="/resumes"><strong>准备多份简历</strong><small>上传主简历和不同方向版本</small></Link></div></section> : null}

    {groups.ready.length ? <section className="platform-section" id="ready"><header><h2>材料齐全，可以投递</h2><span>{groups.ready.length} 个</span></header><div className="platform-data-panel"><div className="platform-table-head platform-application-table-head"><span>岗位</span><span>简历</span><span>状态</span><span>操作</span></div>{groups.ready.map((item) => <ApplicationRow key={item.id} item={item} {...rowProps}/>)}</div></section> : items.length ? <section className="platform-notice neutral" id="ready"><ShieldCheck size={19}/><span><strong>还没有材料齐全的岗位</strong><small>下面列出了仍待确认条件、材料或用户批准的岗位。</small></span><Link href="/jobs">继续选择岗位</Link></section> : null}

    {groups.blocked.length ? <section className="platform-section" id="blocked"><header><h2>等待确认或需要补齐</h2><span>{groups.blocked.length} 个</span></header><div className="platform-data-panel"><div className="platform-table-head platform-application-table-head"><span>岗位</span><span>简历</span><span>状态</span><span>操作</span></div>{groups.blocked.map((item) => <ApplicationRow key={item.id} item={item} {...rowProps}/>)}</div></section> : null}

    {groups.submitted.length ? <details className="platform-history" id="submitted-history"><summary><CheckCircle2 size={16}/>最近已投递 <span>{groups.submitted.length}</span></summary><div>{groups.submitted.map((item) => <ApplicationRow key={item.id} item={item} {...rowProps}/>)}</div></details> : null}
    <p className="platform-safety">一键投递在这里表示：系统生成全部材料并打开已准备的邮件或真实招聘页面。系统不会保存招聘平台密码、Cookie 或验证码，也不会把“打开页面”冒充成已经提交。</p>
  </section>;
}
