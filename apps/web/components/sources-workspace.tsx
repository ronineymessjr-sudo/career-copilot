"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { DatabaseZap, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Source = Record<string, any>;
type Run = Record<string, any>;

function csv(value: string): string[] {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

export function SourcesWorkspace() {
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ provider: "greenhouse", name: "", identifier: "", keywords: "AI, Agent, RAG, LangGraph, 全栈, 产品", locations: "上海, 苏州, 杭州, 南京, 南通, 远程" });

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<{ sources: Source[]; runs: Run[] }>("/api/control/sources");
      setSources(result.sources ?? []);
      setRuns(result.runs ?? []);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载来源失败"); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addSource(event: FormEvent) {
    event.preventDefault();
    setBusy("add");
    try {
      await controlFetch("/api/control/sources", {
        method: "POST",
        body: JSON.stringify({
          provider: form.provider,
          name: form.name,
          identifier: form.identifier,
          filters: { keywords: csv(form.keywords), locations: csv(form.locations), internships_only: true, max_jobs: 100 },
        }),
      });
      setForm((current) => ({ ...current, name: "", identifier: "" }));
      setMessage("来源已保存。可以立即执行一次发现任务。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(""); }
  }

  async function runDiscovery() {
    setBusy("run");
    try {
      const result = await controlFetch<{ discovery: Record<string, any> }>("/api/control/sources/run", { method: "POST", body: "{}" });
      const summary = result.discovery;
      setMessage(`发现完成：扫描 ${summary.jobs_seen ?? 0}，新增 ${summary.jobs_imported ?? 0}，更新 ${summary.jobs_updated ?? 0}，跳过 ${summary.jobs_skipped ?? 0}。`);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "发现任务失败"); }
    finally { setBusy(""); }
  }

  async function toggle(source: Source) {
    setBusy(String(source.id));
    try {
      await controlFetch(`/api/control/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !source.enabled }) });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "更新失败"); }
    finally { setBusy(""); }
  }

  async function remove(source: Source) {
    if (!window.confirm(`删除岗位来源“${source.name}”？已导入的岗位不会删除。`)) return;
    setBusy(String(source.id));
    try {
      await controlFetch(`/api/control/sources/${source.id}`, { method: "DELETE" });
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "删除失败"); }
    finally { setBusy(""); }
  }

  return <div className="control-grid sources-layout">
    <section className="control-panel">
      <header className="control-heading"><div><span className="eyebrow">Public ATS discovery</span><h2>岗位来源</h2><p>从 Greenhouse 与 Lever 的公开岗位 API 拉取 JD，自动去重、解析和评分；不会自动投递。</p></div><button className="icon-button" onClick={()=>void load()}><RefreshCw size={15}/></button></header>
      {message ? <div className="control-message">{message}</div> : null}
      <div className="source-toolbar"><button className="primary-button" onClick={()=>void runDiscovery()} disabled={busy === "run"}><Play size={14}/>{busy === "run" ? "正在发现" : "立即发现全部来源"}</button><span>Cloudflare Cron 每天北京时间 19:00 自动执行。</span></div>
      <div className="source-list">
        {sources.length === 0 ? <div className="empty-state"><DatabaseZap size={25}/><strong>还没有岗位来源</strong><span>添加目标公司的 Greenhouse board token 或 Lever site name。</span></div> : sources.map((source) => <article className="source-card" key={source.id}>
          <div><span className="source-provider">{source.provider}</span><h3>{source.name}</h3><p>{source.identifier}</p></div>
          <div className="source-stats"><strong>{source.last_status ?? "never"}</strong><span>{source.last_checked_at ? new Date(source.last_checked_at).toLocaleString("zh-CN") : "尚未运行"}</span><small>{source.last_error || `上次新增 ${source.last_result?.imported ?? 0} / 更新 ${source.last_result?.updated ?? 0}`}</small></div>
          <div className="source-actions"><button className="ghost-button" onClick={()=>void toggle(source)} disabled={busy === String(source.id)}>{source.enabled ? "暂停" : "启用"}</button><button className="icon-button danger" onClick={()=>void remove(source)} disabled={busy === String(source.id)}><Trash2 size={14}/></button></div>
        </article>)}
      </div>
      <section className="run-history"><h3>最近发现任务</h3>{runs.slice(0,8).map((run) => <div className="run-row" key={run.id}><span>{run.trigger_type}</span><strong>{run.status}</strong><small>扫描 {run.jobs_seen} · 新增 {run.jobs_imported} · 更新 {run.jobs_updated}</small><time>{new Date(run.started_at).toLocaleString("zh-CN")}</time></div>)}</section>
    </section>
    <aside className="control-panel sticky-panel"><form className="control-form" onSubmit={addSource}><div><span className="eyebrow">Add source</span><h2>添加公开 ATS 来源</h2><p>Greenhouse 使用 careers URL 中的 board token；Lever 使用 jobs.lever.co 后的 site name。</p></div><label>提供商<select value={form.provider} onChange={(e)=>setForm({...form,provider:e.target.value})}><option value="greenhouse">Greenhouse</option><option value="lever">Lever</option></select></label><label>公司名称<input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="例如 OpenAI" required/></label><label>站点标识<input value={form.identifier} onChange={(e)=>setForm({...form,identifier:e.target.value})} placeholder="board token / site name" required/></label><label>关键词<input value={form.keywords} onChange={(e)=>setForm({...form,keywords:e.target.value})}/></label><label>地点<input value={form.locations} onChange={(e)=>setForm({...form,locations:e.target.value})}/></label><button className="primary-button" disabled={busy === "add"}><Plus size={14}/>保存来源</button></form></aside>
  </div>;
}
