"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ExternalLink, Inbox, RefreshCw, ShieldCheck } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Application = Record<string, any>;

type HandoffResponse = {
  target_url: string;
  channel: string;
  mode: "browser_handoff";
  external_submission_performed: false;
};

function ApplicationRow({
  item,
  activeHandoffId,
  busyId,
  onStart,
  onConfirm,
}: {
  item: Application;
  activeHandoffId: string;
  busyId: string;
  onStart: (item: Application) => Promise<void>;
  onConfirm: (item: Application) => Promise<void>;
}) {
  const job = item.job ?? {};
  const pack = item.application_package ?? {};
  const readiness = item.readiness ?? { blockers: [] };
  const ready = item.status === "ready_to_submit" && readiness.ready_to_submit === true;
  const opened = activeHandoffId === String(item.id);

  return <article className="focus-application-row">
    <div className="focus-application-copy">
      <span>{job.company_name ?? "待核验公司"}</span>
      <strong>{job.title ?? "岗位"}</strong>
      <small>{pack.resume_version_name ? `简历：${pack.resume_version_name}` : "简历待匹配"}</small>
    </div>

    {ready ? <div className="focus-application-actions">
      <button className="primary-button" type="button" onClick={() => void onStart(item)} disabled={busyId === `open-${item.id}`}>
        <ExternalLink size={12}/>{busyId === `open-${item.id}` ? "连接中…" : "打开并投递"}
      </button>
      {opened ? <button className="ghost-button" type="button" onClick={() => void onConfirm(item)} disabled={busyId === `confirm-${item.id}`}>确认完成</button> : null}
    </div> : item.status === "submitted" ? <span className="focus-status done">已投递</span> : <span className="focus-status warn">待处理</span>}

    {pack.greeting || readiness.blockers?.length ? <details className="focus-application-details">
      <summary><ChevronDown size={12}/>{readiness.blockers?.length ? "为什么还不能投" : "查看招呼语"}</summary>
      <div>{readiness.blockers?.length ? <p>{readiness.blockers.join("；")}</p> : <p>{pack.greeting}</p>}</div>
    </details> : null}
  </article>;
}

export function ApplicationsWorkspace() {
  const [items, setItems] = useState<Application[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [activeHandoffId, setActiveHandoffId] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<{ applications: Application[] }>("/api/control/applications");
      setItems(result.applications ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载投递记录失败");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => ({
    ready: items.filter((item) => item.status === "ready_to_submit" && item.readiness?.ready_to_submit === true),
    submitted: items.filter((item) => item.status === "submitted").slice(0, 10),
    blocked: items.filter((item) => item.status !== "submitted" && !(item.status === "ready_to_submit" && item.readiness?.ready_to_submit === true)),
  }), [items]);

  async function startSubmission(item: Application) {
    const popup = window.open("about:blank", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.title = "正在连接投递入口…";
      popup.document.body.textContent = "Career Copilot 正在验证投递入口…";
    }
    setBusyId(`open-${item.id}`);
    try {
      const result = await controlFetch<HandoffResponse>(`/api/control/applications/${item.id}/open-submission`, { method: "POST" });
      setActiveHandoffId(String(item.id));
      setMessage("招聘页面已打开。完成平台提交后，回到这里点击“确认完成”。");
      if (popup) popup.location.replace(result.target_url);
      else window.location.assign(result.target_url);
    } catch (error) {
      popup?.close();
      setMessage(error instanceof Error ? error.message : "投递入口连接失败");
    } finally {
      setBusyId("");
    }
  }

  async function confirmSubmitted(item: Application) {
    const job = item.job ?? {};
    if (!window.confirm(`确认已经完成投递？\n\n${job.company_name ?? ""} · ${job.title ?? ""}`)) return;
    setBusyId(`confirm-${item.id}`);
    try {
      await controlFetch(`/api/control/applications/${item.id}/confirm-submission`, {
        method: "POST",
        body: JSON.stringify({ confirmed: true, note: "用户确认已在招聘平台完成提交" }),
      });
      setActiveHandoffId("");
      setMessage("已记录为已投递。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "状态更新失败");
    } finally {
      setBusyId("");
    }
  }

  return <section className="focus-workspace">
    <header className="focus-workspace-head">
      <div><h1>待投递</h1><p>{groups.ready.length} 个岗位已经完成简历匹配和材料检查。</p></div>
      <button className="focus-icon-button" aria-label="刷新投递记录" onClick={() => void load()}><RefreshCw size={14}/></button>
    </header>

    {message ? <div className="focus-message">{message}</div> : null}

    <div className="focus-application-list">
      {groups.ready.length ? groups.ready.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted}/>) : <div className="focus-empty"><Inbox size={18}/><span>暂无可以直接投递的岗位</span><Link href="/jobs">去选岗位</Link></div>}
    </div>

    {groups.blocked.length ? <details className="focus-history">
      <summary><ShieldCheck size={12}/>需要补齐 · {groups.blocked.length}</summary>
      <div>{groups.blocked.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted}/>)}</div>
    </details> : null}

    {groups.submitted.length ? <details className="focus-history">
      <summary><CheckCircle2 size={12}/>最近已投递 · {groups.submitted.length}</summary>
      <div>{groups.submitted.map((item) => <ApplicationRow key={item.id} item={item} activeHandoffId={activeHandoffId} busyId={busyId} onStart={startSubmission} onConfirm={confirmSubmitted}/>)}</div>
    </details> : null}

    <p className="focus-safety">系统负责匹配简历和准备材料；招聘平台的登录、验证码与最终提交仍在平台页面完成。</p>
  </section>;
}
