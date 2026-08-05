"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, ExternalLink, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Application = Record<string, any>;
type HandoffResponse = { target_url: string; channel: string; mode: "browser_handoff"; external_submission_performed: false };

function ApplicationRow({ item, activeHandoffId, busyId, onStart, onConfirm }: { item: Application; activeHandoffId: string; busyId: string; onStart: (item: Application) => Promise<void>; onConfirm: (item: Application) => Promise<void> }) {
  const job = item.job ?? {};
  const pack = item.application_package ?? {};
  const readiness = item.readiness ?? { blockers: [] };
  const ready = item.status === "ready_to_submit" && readiness.ready_to_submit === true;
  const opened = activeHandoffId === String(item.id);
  return <article className="platform-application-row">
    <div className="platform-application-job"><span>{job.company_name ?? "待核验公司"}</span><strong>{job.title ?? "岗位"}</strong><small>{[job.city, job.workplace, job.source_name || item.channel].filter(Boolean).join(" · ") || "岗位入口已准备"}</small></div>
    <div className="platform-application-resume"><span>已匹配简历</span><strong>{pack.resume_version_name || "简历待匹配"}</strong><small>{pack.truth_check?.application_plan?.resume_alignment_score != null ? `匹配度 ${pack.truth_check.application_plan.resume_alignment_score}%` : "等待材料匹配"}</small></div>
    <div className="platform-application-state">{ready ? <span className="platform-status ok">可以投递</span> : item.status === "submitted" ? <span className="platform-status done">已投递</span> : <span className="platform-status warn">需要补齐</span>}</div>
    <div className="platform-application-actions">{ready ? <><button className="primary-button" type="button" onClick={() => void onStart(item)} disabled={busyId === `open-${item.id}`}><ExternalLink size={15}/>{busyId === `open-${item.id}` ? "连接中…" : "前往投递"}</button>{opened ? <button className="ghost-button" type="button" onClick={() => void onConfirm(item)} disabled={busyId === `confirm-${item.id}`}>标记已投递</button> : null}</> : item.status === "submitted" ? <small>{item.submitted_at ? new Date(item.submitted_at).toLocaleString("zh-CN") : "已确认"}</small> : <Link className="ghost-button" href="/jobs">返回岗位池处理</Link>}</div>
    {pack.greeting || readiness.blockers?.length ? <details className="platform-application-details"><summary><ChevronDown size={14}/>{readiness.blockers?.length ? "查看阻塞原因" : "查看投递话术"}</summary><div>{readiness.blockers?.length ? <ul>{readiness.blockers.map((blocker: string) => <li key={blocker}>{blocker}</li>)}</ul> : <p>{pack.greeting}</p>}</div></details> : null}
  </article>;
}

export function ApplicationsWorkspace() {
  const [items, setItems] = useState<Application[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [activeHandoffId, setActiveHandoffId] = useState("");

  const load = useCallback(async () => {
    try { const result = await controlFetch<{ applications: Application[] }>("/api/control/applications"); setItems(result.applications ?? []); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "加载投递记录失败"); }
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

  return <section className="platform-workspace">
    <header className="platform-page-head"><div><h1>投递管理</h1><p>岗位只有在你点击“投这个”、系统完成简历匹配并通过材料检查后，才会进入这里。</p></div><button className="platform-refresh" onClick={() => void load()}><RefreshCw size={16}/>刷新</button></header>

    <section className="platform-queue-summary"><article><strong>{groups.ready.length}</strong><span>可以直接投递</span></article><article><strong>{groups.blocked.length}</strong><span>需要补齐</span></article><article><strong>{groups.submitted.length}</strong><span>最近已完成</span></article><Link href="/jobs">继续选岗位<ArrowRight size={15}/></Link></section>
    {message ? <div className="platform-message">{message}</div> : null}

    {!items.length ? <section className="platform-empty-guide"><Inbox size={26}/><h2>投递队列目前为空</h2><p>这不是系统没有岗位，而是你还没有从完整岗位池中选择要投递的岗位。</p><div><Link href="/jobs"><strong>1. 去岗位池选择</strong><small>浏览全部岗位，点击“投这个”</small></Link><Link href="/profile"><strong>2. 完善画像</strong><small>让推荐和资格判断更准确</small></Link><Link href="/sources"><strong>3. 扩充岗位来源</strong><small>连接 ATS 或导入招聘平台链接</small></Link></div></section> : null}

    {groups.ready.length ? <section className="platform-section"><header><h2>等待投递</h2><span>{groups.ready.length} 个</span></header><div className="platform-data-panel"><div className="platform-table-head platform-application-table-head"><span>岗位</span><span>简历</span><span>状态</span><span>操作</span></div>{groups.ready.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted}/>)}</div></section> : items.length ? <section className="platform-notice neutral"><ShieldCheck size={19}/><span><strong>还没有可以直接投递的岗位</strong><small>下面列出了当前选择过、但仍需补条件或材料的岗位。</small></span><Link href="/jobs">继续选择岗位</Link></section> : null}

    {groups.blocked.length ? <section className="platform-section"><header><h2>需要补齐</h2><span>{groups.blocked.length} 个</span></header><div className="platform-data-panel"><div className="platform-table-head platform-application-table-head"><span>岗位</span><span>简历</span><span>状态</span><span>操作</span></div>{groups.blocked.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted}/>)}</div></section> : null}

    {groups.submitted.length ? <details className="platform-history"><summary><CheckCircle2 size={16}/>最近已投递 <span>{groups.submitted.length}</span></summary><div>{groups.submitted.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted}/>)}</div></details> : null}
    <p className="platform-safety">最终提交仍在招聘平台页面完成；工作台不会保存平台密码、Cookie 或验证码，也不会把“打开页面”冒充为“已经投递”。</p>
  </section>;
}
