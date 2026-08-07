"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Link2, Play, RefreshCw, SearchCheck, ShieldCheck } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Source = Record<string, any>;
type Run = Record<string, any>;

const LINK_IMPORT_PLATFORMS = [
  ["公司官网 / Workday", "复制真实岗位链接和 JD，系统统一解析、去重和推荐。"],
  ["BOSS 直聘", "通过用户提供的真实岗位链接导入，不绕过登录或验证码。"],
  ["LinkedIn Jobs", "保存岗位链接与 JD，后续在已登录浏览器中完成投递。"],
  ["实习僧 / 牛客", "适合实习岗位链接导入，保留来源和发布时间。"],
  ["智联 / 前程无忧 / 猎聘", "通过链接和 JD 进入统一岗位池，不伪装成官方 API。"],
  ["邮件 / 内推 / 校招群", "手动录入 JD 和联系人信息，仍使用同一套匹配流程。"],
] as const;

export function SourcesWorkspace() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<{ sources: Source[]; runs: Run[] }>("/api/control/sources");
      setRuns(result.runs ?? []);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载来源失败"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function runDiscovery() {
    setBusy("run");
    try {
      const result = await controlFetch<{ discovery: Record<string, any> }>("/api/control/sources/run", { method: "POST", body: "{}" });
      const summary = result.discovery;
      setMessage(`发现完成：扫描 ${summary.jobs_seen ?? 0}，新增 ${summary.jobs_imported ?? 0}，更新 ${summary.jobs_updated ?? 0}，跳过 ${summary.jobs_skipped ?? 0}。`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "发现任务失败"); }
    finally { setBusy(""); }
  }

  const latestRun = runs[0] ?? null;

  return <section className="platform-workspace">
    <header className="platform-page-head"><div><h1>岗位来源</h1><p>用真实岗位链接 + JD 导入岗位，系统统一解析、去重、资格分析和画像排序，再决定投递。</p></div><button className="platform-refresh" onClick={() => void load()}><RefreshCw size={16}/>刷新</button></header>
    {message ? <div className="platform-message">{message}</div> : null}

    <section className="platform-source-summary"><article><strong>{runs.length ? runs[0]?.jobs_imported ?? 0 : 0}</strong><span>上次新增</span></article><article><strong>{runs.length ? runs[0]?.jobs_updated ?? 0 : 0}</strong><span>上次更新</span></article><article><strong>{runs.length ? runs[0]?.jobs_seen ?? 0 : 0}</strong><span>上次扫描</span></article><button className="primary-button" onClick={() => void runDiscovery()} disabled={busy === "run"}><Play size={15}/>{busy === "run" ? "正在聚合…" : "聚合我的来源"}</button></section>

    <section className="platform-panel platform-import-guide">
      <header className="platform-panel-head"><div><h2><SearchCheck size={19}/>怎么开始</h2><p>岗位来源以“链接 / JD 导入”为核心，不需要连接任何公司 ATS，也不保存平台密码。三步即可用：</p></div></header>
      <div className="platform-onboarding-steps">
        <Link href="/jobs#import-job"><span><strong>1. 导入岗位</strong><small>在岗位发现页粘贴任意平台的真实岗位链接和 JD</small></span></Link>
        <Link href="/jd"><span><strong>2. 深拆评估</strong><small>用 JD 深拆看匹配度、缺口和该不该投</small></span></Link>
        <Link href="/jobs"><span><strong>3. 投递准备</strong><small>自动匹配简历、生成求职信、打开真实投递页</small></span></Link>
      </div>
    </section>

    <section className="platform-panel">
      <header className="platform-panel-head"><div><h2>支持的招聘平台</h2><p>都通过真实岗位链接和 JD 导入，不会绕过平台登录、验证码或反机器人机制。</p></div><Link href="/jobs#import-job">去导入岗位<Link2 size={15}/></Link></header>
      <div className="platform-link-platforms">{LINK_IMPORT_PLATFORMS.map(([name, copy]) => <article key={name}><ExternalLink size={18}/><span><strong>{name}</strong><small>{copy}</small></span></article>)}</div>
      <div className="platform-compliance-note"><ShieldCheck size={18}/><span><strong>聚合边界</strong><small>系统负责解析、去重、匹配和准备材料；最终投递由你确认，并在招聘平台允许的登录状态中完成，系统从不自动提交。</small></span></div>
    </section>

    <section className="platform-panel platform-run-history"><header className="platform-panel-head"><div><h2>最近聚合任务</h2><p>可查看岗位池为什么增长、没有增长或出现错误。</p></div></header>{runs.length ? runs.slice(0, 10).map((run) => <div key={run.id}><span>{run.trigger_type === "cron" ? "定时" : "手动"}</span><strong>{run.status}</strong><small>来源 {run.source_count} · 扫描 {run.jobs_seen} · 新增 {run.jobs_imported} · 更新 {run.jobs_updated} · 跳过 {run.jobs_skipped}</small><time>{new Date(run.started_at).toLocaleString("zh-CN")}</time></div>) : <p className="platform-muted">尚未运行岗位聚合。可直接在岗位发现页导入岗位，不依赖来源任务。</p>}</section>
  </section>;
}
