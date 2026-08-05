"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, ChevronDown, ExternalLink, Inbox, RefreshCw, Save, ShieldCheck, Sparkles } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Application = Record<string, any>;
type HandoffResponse = { target_url: string; channel: string; mode: "browser_handoff"; external_submission_performed: false };
type AutomationPreference = {
  enabled: boolean;
  timezone: string;
  recommendation_limit: number;
  minimum_score: number;
  auto_prepare_enabled: boolean;
  auto_prepare_limit: number;
  require_profile_score: number;
};

function ApplicationRow({ item, activeHandoffId, busyId, onStart, onConfirm, onApprove }: { item: Application; activeHandoffId: string; busyId: string; onStart: (item: Application) => Promise<void>; onConfirm: (item: Application) => Promise<void>; onApprove: (item: Application) => Promise<void> }) {
  const job = item.job ?? {};
  const pack = item.application_package ?? {};
  const readiness = item.readiness ?? { blockers: [] };
  const ready = item.status === "ready_to_submit" && readiness.ready_to_submit === true;
  const opened = activeHandoffId === String(item.id);
  const canApprove = item.status !== "submitted" && pack.id && pack.approval === "pending" && pack.truth_check?.passed === true && item.evaluation?.eligible === true && item.evaluation?.needs_confirmation !== true;
  return <article className="platform-application-row">
    <div className="platform-application-job"><span>{job.company_name ?? "待核验公司"}</span><strong>{job.title ?? "岗位"}</strong><small>{[job.city, job.workplace, job.source_name || item.channel].filter(Boolean).join(" · ") || "岗位入口已准备"}</small></div>
    <div className="platform-application-resume"><span>已匹配简历</span><strong>{pack.resume_version_name || "简历待匹配"}</strong><small>{pack.truth_check?.application_plan?.resume_alignment_score != null ? `匹配度 ${pack.truth_check.application_plan.resume_alignment_score}%` : "等待材料匹配"}</small></div>
    <div className="platform-application-state">{ready ? <span className="platform-status ok">可以投递</span> : item.status === "submitted" ? <span className="platform-status done">已投递</span> : canApprove ? <span className="platform-status warn">等待批准</span> : <span className="platform-status warn">需要补齐</span>}</div>
    <div className="platform-application-actions">
      {ready ? <><button className="primary-button" type="button" onClick={() => void onStart(item)} disabled={busyId === `open-${item.id}`}><ExternalLink size={15}/>{busyId === `open-${item.id}` ? "连接中…" : "前往投递"}</button>{opened ? <button className="ghost-button" type="button" onClick={() => void onConfirm(item)} disabled={busyId === `confirm-${item.id}`}>标记已投递</button> : null}</>
        : item.status === "submitted" ? <small>{item.submitted_at ? new Date(item.submitted_at).toLocaleString("zh-CN") : "已确认"}</small>
        : canApprove ? <button className="primary-button" type="button" onClick={() => void onApprove(item)} disabled={busyId === `approve-${item.id}`}><CheckCircle2 size={15}/>{busyId === `approve-${item.id}` ? "批准中…" : "检查并批准"}</button>
        : <Link className="ghost-button" href={`/jobs?job=${encodeURIComponent(String(job.id ?? ""))}`}>返回岗位处理</Link>}
    </div>
    {pack.greeting || readiness.blockers?.length ? <details className="platform-application-details"><summary><ChevronDown size={14}/>{readiness.blockers?.length ? "查看阻塞原因" : "查看投递话术"}</summary><div>{readiness.blockers?.length ? <ul>{readiness.blockers.map((blocker: string) => <li key={blocker}>{blocker}</li>)}</ul> : <p>{pack.greeting}</p>}</div></details> : null}
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

  async function startSubmission(item: Application) {
    const popup = window.open("about:blank", "_blank");
    if (popup) { popup.opener = null; popup.document.title = "正在连接投递入口…"; popup.document.body.textContent = "Career Copilot 正在验证投递入口…"; }
    setBusyId(`open-${item.id}`);
    try { const result = await controlFetch<HandoffResponse>(`/api/control/applications/${item.id}/open-submission`, { method: "POST" }); setActiveHandoffId(String(item.id)); setMessage("招聘页面已打开。完成平台提交后，回到这里点击“标记已投递”。"); if (popup) popup.location.replace(result.target_url); else window.location.assign(result.target_url); }
    catch (error) { popup?.close(); setMessage(error instanceof Error ? error.message : "投递入口连接失败"); }
    finally { setBusyId(""); }
  }

  async function confirmSubmitted(item: Application) {
    const job = item.job ?? {};
    if (!window.confirm(`确认已经完成投递？\n\n${job.company_name ?? ""} · ${job.title ?? ""}`)) return;
    setBusyId(`confirm-${item.id}`);
    try { await controlFetch(`/api/control/applications/${item.id}/confirm-submission`, { method: "POST", body: JSON.stringify({ confirmed: true, note: "用户确认已在招聘平台完成提交" }) }); setActiveHandoffId(""); setMessage("已记录为已投递。"); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "状态更新失败"); }
    finally { setBusyId(""); }
  }

  async function approve(item: Application) {
    const pack = item.application_package;
    if (!pack?.id) return;
    setBusyId(`approve-${item.id}`);
    try {
      await controlFetch(`/api/control/approvals/${pack.id}`, { method: "POST", body: JSON.stringify({ decision: "approve", channel: item.job?.channel || item.channel || "platform", note: "用户确认每日推荐自动准备的材料" }) });
      setMessage("材料已批准，岗位已进入可以投递列表。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "批准失败"); }
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
      setMessage(`今日推荐已重新生成：推荐 ${result.result.recommended ?? 0} 个岗位，自动准备 ${result.result.prepared ?? 0} 个投递。`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "今日推荐运行失败"); }
    finally { setBusyId(""); }
  }

  return <section className="platform-workspace">
    <header className="platform-page-head"><div><h1>投递管理</h1><p>每日推荐会自动匹配简历、检查材料并准备投递包；最终外部提交仍由你确认。</p></div><button className="platform-refresh" onClick={() => void load()}><RefreshCw size={16}/>刷新</button></header>

    <section className="platform-panel automation-panel">
      <header><Bot size={20}/><div><h2>每日推荐与自动投递准备</h2><p>每天 08:00（亚洲时区）为每个账号独立生成推荐。系统可自动准备材料，但不会绕过平台登录、验证码或最终提交确认。</p></div><button className="ghost-button compact" type="button" onClick={() => void runNow()} disabled={busyId === "automation-run"}><Sparkles size={14}/>{busyId === "automation-run" ? "运行中…" : "立即生成今日推荐"}</button></header>
      {automation ? <div className="automation-settings">
        <label className="platform-checkbox"><input type="checkbox" checked={automation.enabled} onChange={(event) => setAutomation({ ...automation, enabled: event.target.checked })}/>启用每日推荐</label>
        <label className="platform-checkbox"><input type="checkbox" checked={automation.auto_prepare_enabled} onChange={(event) => setAutomation({ ...automation, auto_prepare_enabled: event.target.checked })}/>自动匹配简历并准备投递材料</label>
        <label>每日推荐数量<input type="number" min="1" max="30" value={automation.recommendation_limit} onChange={(event) => setAutomation({ ...automation, recommendation_limit: Number(event.target.value) })}/></label>
        <label>最低匹配分<input type="number" min="0" max="100" value={automation.minimum_score} onChange={(event) => setAutomation({ ...automation, minimum_score: Number(event.target.value) })}/></label>
        <label>每日自动准备上限<input type="number" min="0" max="10" value={automation.auto_prepare_limit} onChange={(event) => setAutomation({ ...automation, auto_prepare_limit: Number(event.target.value) })}/></label>
        <button className="primary-button compact" type="button" onClick={() => void saveAutomation()} disabled={busyId === "automation-save"}><Save size={14}/>{busyId === "automation-save" ? "保存中…" : "保存设置"}</button>
      </div> : null}
      <footer>{latest ? <span>最近生成：{latest.recommendation_date} · 推荐 {(latest.ranked_job_ids ?? []).length} 个 · 准备 {(latest.prepared_application_ids ?? []).length} 个</span> : <span>尚未生成个人每日推荐</span>}</footer>
    </section>

    <section className="platform-queue-summary"><article><strong>{groups.ready.length}</strong><span>可以直接投递</span></article><article><strong>{groups.blocked.length}</strong><span>等待批准或补齐</span></article><article><strong>{groups.submitted.length}</strong><span>最近已完成</span></article><Link href="/jobs">继续选岗位<ArrowRight size={15}/></Link></section>
    {message ? <div className="platform-message">{message}</div> : null}

    {!items.length ? <section className="platform-empty-guide"><Inbox size={26}/><h2>投递队列目前为空</h2><p>立即运行一次今日推荐，系统会从完整岗位池中选择匹配岗位并准备投递；也可以手动从岗位池点击“投这个”。</p><div><button className="primary-button" type="button" onClick={() => void runNow()}><Sparkles size={15}/>生成今日推荐</button><Link href="/jobs"><strong>浏览完整岗位池</strong><small>查看所有岗位并手动选择</small></Link><Link href="/resumes"><strong>准备多份简历</strong><small>上传主简历和不同方向版本</small></Link></div></section> : null}

    {groups.ready.length ? <section className="platform-section"><header><h2>等待投递</h2><span>{groups.ready.length} 个</span></header><div className="platform-data-panel"><div className="platform-table-head platform-application-table-head"><span>岗位</span><span>简历</span><span>状态</span><span>操作</span></div>{groups.ready.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted} onApprove={approve}/>)}</div></section> : items.length ? <section className="platform-notice neutral"><ShieldCheck size={19}/><span><strong>还没有可以直接投递的岗位</strong><small>下面列出了自动准备或手动选择后，仍待批准、补条件或补材料的岗位。</small></span><Link href="/jobs">继续选择岗位</Link></section> : null}

    {groups.blocked.length ? <section className="platform-section"><header><h2>等待批准或需要补齐</h2><span>{groups.blocked.length} 个</span></header><div className="platform-data-panel"><div className="platform-table-head platform-application-table-head"><span>岗位</span><span>简历</span><span>状态</span><span>操作</span></div>{groups.blocked.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted} onApprove={approve}/>)}</div></section> : null}

    {groups.submitted.length ? <details className="platform-history"><summary><CheckCircle2 size={16}/>最近已投递 <span>{groups.submitted.length}</span></summary><div>{groups.submitted.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted} onApprove={approve}/>)}</div></details> : null}
    <p className="platform-safety">自动投递在这里的含义是：自动推荐、自动选简历、自动生成材料并加入待投递队列。最终提交仍在招聘平台页面完成；工作台不会保存平台密码、Cookie 或验证码。</p>
  </section>;
}
