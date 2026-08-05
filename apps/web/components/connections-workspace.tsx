"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Database, ExternalLink, FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type ConnectionState = {
  jobs: number;
  validEntries: number;
  applications: number;
  runtimeVersion: string;
};

export function ConnectionsWorkspace() {
  const [state, setState] = useState<ConnectionState>({ jobs: 0, validEntries: 0, applications: 0, runtimeVersion: "--" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [jobsResult, applicationsResult, runtimeResponse] = await Promise.all([
        controlFetch<{ jobs: Array<Record<string, any>> }>("/api/control/jobs"),
        controlFetch<{ applications: Array<Record<string, any>> }>("/api/control/applications"),
        fetch("/api/runtime", { cache: "no-store" }).then((response) => response.json()).catch(() => ({})),
      ]);
      const jobs = jobsResult.jobs ?? [];
      setState({
        jobs: jobs.length,
        validEntries: jobs.filter((job) => /^https?:\/\//.test(String(job.source_url ?? ""))).length,
        applications: applicationsResult.applications?.length ?? 0,
        runtimeVersion: String(runtimeResponse.version ?? "--"),
      });
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "连接检查失败");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <section className="control-panel compact-panel connections-panel">
    <header className="control-heading compact-heading"><div><span className="eyebrow">Connections</span><h2>规则与连接</h2><p>这里显示系统已经接通的环节，以及仍需招聘平台配合的环节。</p></div><button className="icon-button" type="button" aria-label="刷新连接" onClick={() => void load()} disabled={busy}><RefreshCw size={14}/></button></header>
    {error ? <div className="control-message">{error}</div> : null}

    <div className="connection-list">
      <article><Database size={16}/><div><strong>Supabase 数据与登录</strong><span>已连接 · 版本 {state.runtimeVersion}</span></div><CheckCircle2 size={15}/></article>
      <article><BriefcaseBusiness size={16}/><div><strong>岗位入口</strong><span>{state.validEntries}/{state.jobs} 条岗位具备真实 URL</span></div><CheckCircle2 size={15}/></article>
      <article><ExternalLink size={16}/><div><strong>招聘平台</strong><span>浏览器辅助：系统完成匹配和材料，使用你当前浏览器的登录状态进入平台</span></div><ShieldCheck size={15}/></article>
      <article><ShieldCheck size={16}/><div><strong>最终提交</strong><span>你选择岗位并确认后，系统进入投递；平台登录、验证码或反机器人校验仍由平台处理</span></div><ShieldCheck size={15}/></article>
    </div>

    <div className="connection-note"><strong>完整链路</strong><p>系统找岗 → 你选择“投这个” → 自动匹配最佳简历 → 检查缺口与额外材料 → 通过后确认投递 → 连接招聘平台 → 回写投递结果。</p></div>

    <div className="settings-shortcuts">
      <Link href="/resumes"><FileText size={14}/>简历库</Link>
      <Link href="/career-vault"><ShieldCheck size={14}/>项目证据</Link>
      <Link href="/applications"><ExternalLink size={14}/>投递执行</Link>
    </div>
  </section>;
}
