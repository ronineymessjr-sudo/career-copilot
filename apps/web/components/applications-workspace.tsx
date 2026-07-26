"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, FileDown, Inbox, MailPlus, PlugZap, RefreshCw, ShieldCheck } from "lucide-react";
import { controlDownload, controlFetch } from "@/lib/control-client";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Application = Record<string, any>;
const GMAIL_TOKEN_KEY = "career_copilot_gmail_access_token";

export function ApplicationsWorkspace() {
  const [items, setItems] = useState<Application[]>([]);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [gmailConnected, setGmailConnected] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<{ applications: Application[] }>("/api/control/applications");
      setItems(result.applications ?? []);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载失败"); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const capture = (session: any) => {
      const token = typeof session?.provider_token === "string" ? session.provider_token : "";
      if (token) sessionStorage.setItem(GMAIL_TOKEN_KEY, token);
      setGmailConnected(Boolean(sessionStorage.getItem(GMAIL_TOKEN_KEY)));
    };
    void supabase.auth.getSession().then(({ data }) => capture(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => capture(session));
    return () => data.subscription.unsubscribe();
  }, []);

  async function connectGmail() {
    const supabase = getSupabaseBrowser();
    if (!supabase) { setMessage("Supabase 尚未配置"); return; }
    try {
      const auth = supabase.auth as any;
      const { error } = await auth.linkIdentity({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/gmail.compose",
          redirectTo: `${window.location.origin}/applications`,
          queryParams: { prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? `${error.message}。请确认 Supabase 已启用 Google Provider 与 Manual Identity Linking。` : "Gmail 连接失败");
    }
  }


  function disconnectGmail() {
    sessionStorage.removeItem(GMAIL_TOKEN_KEY);
    setGmailConnected(false);
    setMessage("已清除当前标签页中的 Gmail 访问令牌。Google 身份仍保持关联，可稍后重新授权。");
  }

  async function confirmSubmitted(item: Application) {
    const job = item.job ?? {};
    if (!window.confirm(`只在你已经于外部招聘渠道完成最终提交后确认。\n\n${job.company_name ?? ""} · ${job.title ?? ""}\n\n确认后系统会记录为 SUBMITTED，但不会替你发送任何内容。`)) return;
    const externalReference = window.prompt("可选：填写申请编号、站内会话或投递页面备注。", "") ?? "";
    setBusyId(String(item.id));
    try {
      await controlFetch(`/api/control/applications/${item.id}/confirm-submission`, {
        method: "POST",
        body: JSON.stringify({ confirmed: true, external_reference: externalReference, note: "用户确认已在外部渠道提交" }),
      });
      setMessage("已记录为已投递。系统未代替你发送或点击提交。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "状态更新失败"); }
    finally { setBusyId(""); }
  }

  async function exportPacket(item: Application, format: "markdown" | "json" | "html" | "eml") {
    const job = item.job ?? {};
    const ext = { markdown: "md", json: "json", html: "html", eml: "eml" }[format];
    const filename = `${job.company_name ?? "company"}-${job.title ?? "application"}.${ext}`.replace(/[\\/:*?"<>|]/g, "-");
    setBusyId(`export-${format}-${item.id}`);
    try {
      await controlDownload(`/api/control/applications/${item.id}/export?format=${format}`, filename, format === "html");
      setMessage(format === "html" ? "已打开可打印材料页，可保存为 PDF。" : "材料已导出。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "导出失败"); }
    finally { setBusyId(""); }
  }

  async function createGmailDraft(item: Application) {
    const job = item.job ?? {};
    const token = sessionStorage.getItem(GMAIL_TOKEN_KEY) ?? "";
    if (!token) { setMessage("请先连接 Gmail。访问令牌仅保存在当前浏览器标签页。 "); return; }
    const recipient = window.prompt("招聘邮箱", job.recruiter_email ?? "")?.trim() ?? "";
    if (!recipient) return;
    setBusyId(`gmail-${item.id}`);
    try {
      const result = await controlFetch<{ draft: { id: string; recipient: string }; sent: boolean }>(`/api/control/applications/${item.id}/gmail-draft`, {
        method: "POST",
        body: JSON.stringify({ gmail_access_token: token, to: recipient }),
      });
      setMessage(`Gmail 草稿已创建给 ${result.draft.recipient}。邮件未发送。`);
      await load();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Gmail 草稿创建失败";
      if (/重新连接 Gmail|401|token/i.test(messageText)) {
        sessionStorage.removeItem(GMAIL_TOKEN_KEY);
        setGmailConnected(false);
      }
      setMessage(messageText);
    } finally { setBusyId(""); }
  }

  return <section className="control-panel applications-panel">
    <header className="control-heading"><div><span className="eyebrow">Human approval workflow</span><h2>投递管理</h2><p>材料可以导出或创建 Gmail 草稿；系统永远不会自动发送邮件或最终提交。</p></div><div className="heading-actions"><button className={gmailConnected ? "ghost-button connected" : "ghost-button"} onClick={()=>gmailConnected ? disconnectGmail() : void connectGmail()}><PlugZap size={14}/>{gmailConnected ? "清除 Gmail 会话" : "连接 Gmail"}</button><button className="icon-button" onClick={()=>void load()}><RefreshCw size={15}/></button></div></header>
    <p className="oauth-scope-note">Google 的 gmail.compose 授权范围技术上包含管理草稿和发送邮件；本项目仅调用 Drafts Create，仓库中没有发送接口，访问令牌只保留在当前标签页。</p>
    {message ? <div className="control-message">{message}</div> : null}
    <div className="application-list">
      {items.length === 0 ? <div className="empty-state"><Inbox size={25}/><strong>暂无投递记录</strong><span>岗位材料通过真实性审批后，会进入 READY_TO_SUBMIT。</span></div> : items.map((item)=>{
        const job = item.job ?? {};
        const pack = item.application_package ?? {};
        const readiness = item.readiness ?? { blockers: [] };
        return <article className="application-card" key={item.id}>
          <div className="application-main">
            <div className="application-title"><span>{job.company_name ?? "待核验公司"}</span><h3>{job.title ?? "岗位"}</h3><p>{job.channel ?? item.channel} · {job.city ?? "地点待核验"}</p></div>
            <span className={`application-status status-${item.status}`}>{String(item.status).replaceAll("_"," ")}</span>
          </div>
          <div className="application-content">
            <div><strong>投递话术</strong><p>{pack.greeting || "尚未生成材料"}</p></div>
            <div><strong>简历版本</strong><p>{pack.resume_version_name || "待选择"}</p>{pack.gmail_draft_id ? <small className="draft-proof">Gmail 草稿：已创建 · 未发送</small> : null}</div>
          </div>
          {readiness.blockers?.length ? <div className="blocker-box warning"><ShieldCheck size={15}/><div><strong>尚不能提交</strong><p>{readiness.blockers.join("；")}</p></div></div> : <div className="ready-box"><CheckCircle2 size={16}/><span>资格、证据和审批均已通过，可以由你前往外部渠道提交。</span></div>}
          <footer className="card-actions">
            {pack.id ? <><button className="ghost-button" onClick={()=>void exportPacket(item,"markdown")}><Download size={13}/>Markdown</button><button className="ghost-button" onClick={()=>void exportPacket(item,"json")}><FileDown size={13}/>JSON</button><button className="ghost-button" onClick={()=>void exportPacket(item,"html")}><FileDown size={13}/>打印/PDF</button><button className="ghost-button" onClick={()=>void exportPacket(item,"eml")}><MailPlus size={13}/>EML</button></> : null}
            {item.status === "ready_to_submit" && readiness.ready_to_submit ? <button className="ghost-button" onClick={()=>void createGmailDraft(item)} disabled={busyId === `gmail-${item.id}`}><MailPlus size={13}/>创建 Gmail 草稿</button> : null}
            {job.source_url ? <a className="ghost-button" href={job.source_url} target="_blank" rel="noreferrer">打开投递入口<ExternalLink size={13}/></a> : null}
            {item.status === "ready_to_submit" && readiness.ready_to_submit ? <button className="primary-button" onClick={()=>void confirmSubmitted(item)} disabled={busyId === String(item.id)}>确认我已外部提交</button> : null}
            {item.status === "submitted" ? <span className="submitted-proof">提交时间：{item.submitted_at ? new Date(item.submitted_at).toLocaleString("zh-CN") : "已确认"}</span> : null}
          </footer>
        </article>;
      })}
    </div>
  </section>;
}
