"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, DatabaseZap, ExternalLink, Link2, Play, Plus, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { controlFetch } from "@/lib/control-client";
import { sourceHealthState } from "@/lib/recommendation-experience.mjs";

type Source = Record<string, any>;
type Run = Record<string, any>;

const AUTOMATED_PROVIDERS = [
  { id: "greenhouse", name: "Greenhouse", copy: "公开 Job Board API，无需读取招聘账号。", hint: "公司 careers URL 中的 board token" },
  { id: "lever", name: "Lever", copy: "公开 Postings API，可拉取已发布岗位。", hint: "jobs.lever.co 后面的 site name" },
  { id: "ashby", name: "Ashby", copy: "公开 Job Posting API，可获取岗位和薪酬字段。", hint: "jobs.ashbyhq.com 后面的 job board name" },
] as const;

const LINK_IMPORT_PLATFORMS = [
  ["公司官网 / Workday", "复制真实岗位链接和 JD，系统统一解析、去重和推荐。"],
  ["BOSS 直聘", "通过用户提供的真实岗位链接导入，不绕过登录或验证码。"],
  ["LinkedIn Jobs", "保存岗位链接与 JD，后续在已登录浏览器中完成投递。"],
  ["实习僧 / 牛客", "适合实习岗位链接导入，保留来源和发布时间。"],
  ["智联 / 前程无忧 / 猎聘", "通过链接和 JD 进入统一岗位池，不伪装成官方 API。"],
  ["邮件 / 内推 / 校招群", "手动录入 JD 和联系人信息，仍使用同一套匹配流程。"],
] as const;

function csv(value: string): string[] {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}


function SourceHealth({ source }: { source: Source }) {
  const health = sourceHealthState(source);
  return <div className="platform-source-health"><strong className={`state-${health.key}`}>{health.label}</strong><span>{source.last_checked_at ? new Date(source.last_checked_at).toLocaleString("zh-CN") : "等待首次发现"}</span><small>{source.last_error || health.action || `新增 ${source.last_result?.imported ?? 0} · 更新 ${source.last_result?.updated ?? 0}`}</small></div>;
}

export function SourcesWorkspace() {
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [catalog, setCatalog] = useState<Source[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ provider: "greenhouse", name: "", identifier: "", keywords: "", locations: "", internships_only: false, scope: "private" });

  const load = useCallback(async () => {
    try {
      const [result, catalogPayload] = await Promise.all([
        controlFetch<{ sources: Source[]; runs: Run[] }>("/api/control/sources"),
        controlFetch<{ catalog: Source[] }>("/api/control/source-catalog").catch(() => ({ catalog: [] })),
      ]);
      setSources(result.sources ?? []); setRuns(result.runs ?? []); setCatalog(catalogPayload.catalog ?? []); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载来源失败"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const enabled = sources.filter((source) => source.enabled !== false);
  const sharedSources = sources.filter((source) => source.scope === "shared");
  const personalSources = sources.filter((source) => source.manageable !== false);
  const providerCounts = useMemo(() => Object.fromEntries(AUTOMATED_PROVIDERS.map((provider) => [provider.id, sources.filter((source) => source.provider === provider.id).length])), [sources]);
  const latestRun = runs[0] ?? null;
  const currentProvider = AUTOMATED_PROVIDERS.find((provider) => provider.id === form.provider) ?? AUTOMATED_PROVIDERS[0];

  async function addSource(event: FormEvent) {
    event.preventDefault(); setBusy("add");
    try {
      await controlFetch("/api/control/sources", { method: "POST", body: JSON.stringify({ provider: form.provider, name: form.name, identifier: form.identifier, scope: form.scope, filters: { keywords: csv(form.keywords), locations: csv(form.locations), internships_only: form.internships_only, max_jobs: 200 } }) });
      setForm((current) => ({ ...current, name: "", identifier: "" }));
      setMessage(form.scope === "shared" ? "平台共享来源已保存。运行发现后，公开岗位会进入所有用户可见的岗位池。" : "个人来源已保存。运行发现后，岗位只进入当前账号的私有岗位池。"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setBusy(""); }
  }

  async function runDiscovery() {
    setBusy("run");
    try {
      const result = await controlFetch<{ discovery: Record<string, any> }>("/api/control/sources/run", { method: "POST", body: "{}" });
      const summary = result.discovery;
      setMessage(`发现完成：扫描 ${summary.jobs_seen ?? 0}，新增 ${summary.jobs_imported ?? 0}，更新 ${summary.jobs_updated ?? 0}，跳过 ${summary.jobs_skipped ?? 0}。`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "发现任务失败"); }
    finally { setBusy(""); }
  }

  async function toggle(source: Source) {
    setBusy(String(source.id));
    try { await controlFetch(`/api/control/sources/${source.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !source.enabled }) }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "更新失败"); }
    finally { setBusy(""); }
  }

  async function remove(source: Source) {
    if (!window.confirm(`删除岗位来源“${source.name}”？已导入岗位不会删除。`)) return;
    setBusy(String(source.id));
    try { await controlFetch(`/api/control/sources/${source.id}`, { method: "DELETE" }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "删除失败"); }
    finally { setBusy(""); }
  }

  return <section className="platform-workspace">
    <header className="platform-page-head"><div><h1>岗位来源</h1><p>自动聚合公开 ATS，再用链接/JD 导入覆盖其他招聘平台。每个账号可以配置不同公司和搜索方向。</p></div><button className="platform-refresh" onClick={() => void load()}><RefreshCw size={16}/>刷新</button></header>
    {message ? <div className="platform-message">{message}</div> : null}

    <section className="platform-source-summary"><article><strong>{sources.length}</strong><span>可见来源</span></article><article><strong>{sharedSources.length}</strong><span>平台共享</span></article><article><strong>{personalSources.length}</strong><span>我的来源</span></article><article><strong>{enabled.length}</strong><span>当前启用</span></article><article><strong>{latestRun?.jobs_seen ?? 0}</strong><span>上次扫描</span></article><article><strong>{(latestRun?.jobs_imported ?? 0) + (latestRun?.jobs_updated ?? 0)}</strong><span>上次写入岗位池</span></article><button className="primary-button" onClick={() => void runDiscovery()} disabled={busy === "run"}><Play size={15}/>{busy === "run" ? "正在聚合…" : "聚合我的来源"}</button></section>

    {catalog.length ? <section className="platform-panel source-catalog-panel">
      <header className="platform-panel-head"><div><h2>平台来源目录</h2><p>从已核验公司目录快速添加，不需要每次手动寻找 ATS 标识。</p></div></header>
      <div className="source-catalog-grid">{catalog.slice(0, 12).map((item) => <button type="button" key={item.id} onClick={() => { setForm((current) => ({ ...current, provider: String(item.provider), name: String(item.company_name), identifier: String(item.identifier), locations: Array.isArray(item.locations) ? item.locations.join("，") : current.locations })); document.getElementById("add-source")?.scrollIntoView({ behavior: "smooth" }); }}><span>{item.provider}</span><strong>{item.company_name}</strong><small>{item.industry || (item.verified ? "已核验来源" : "共享来源")}</small></button>)}</div>
    </section> : null}

    <section className="platform-panel">
      <header className="platform-panel-head"><div><h2>可自动聚合的平台</h2><p>使用招聘系统公开提供的岗位读取接口，不需要保存求职者的平台密码。</p></div></header>
      <div className="platform-provider-grid">{AUTOMATED_PROVIDERS.map((provider) => <article key={provider.id}><div><DatabaseZap size={20}/><span className="platform-provider-state"><CheckCircle2 size={14}/>已支持</span></div><h3>{provider.name}</h3><p>{provider.copy}</p><small>{providerCounts[provider.id] ?? 0} 个公司来源已配置</small><button onClick={() => { setForm((current) => ({ ...current, provider: provider.id })); document.getElementById("add-source")?.scrollIntoView({ behavior: "smooth" }); }}>添加公司来源</button></article>)}</div>
    </section>

    <div className="platform-source-layout">
      <section className="platform-panel">
        <header className="platform-panel-head"><div><h2>已连接的公司来源</h2><p>同一 ATS 可以添加很多家公司，岗位池数量不再被写死。</p></div></header>
        <div className="platform-source-list">
          {sources.length ? sources.map((source) => <article key={source.id}>
            <div className="platform-source-main"><span>{source.provider} · {source.scope === "shared" ? "平台共享" : "个人"}</span><strong>{source.name}</strong><small>{source.identifier}</small></div>
            <SourceHealth source={source}/>
            <div className="platform-source-actions">{source.manageable !== false ? <><button className="ghost-button" onClick={() => void toggle(source)} disabled={busy === String(source.id)}>{source.enabled ? "暂停" : "启用"}</button><button className="platform-icon-danger" aria-label={`删除 ${source.name}`} onClick={() => void remove(source)} disabled={busy === String(source.id)}><Trash2 size={15}/></button></> : <span className="platform-managed-note">平台维护</span>}</div>
          </article>) : <div className="platform-empty-state"><DatabaseZap size={22}/><strong>还没有自动来源</strong><p>右侧添加目标公司的 ATS 标识，然后运行一次发现任务。</p></div>}
        </div>
      </section>

      <form className="platform-panel platform-source-form" id="add-source" onSubmit={addSource}>
        <header className="platform-panel-head"><div><h2>添加公司 ATS</h2><p>{currentProvider.hint}</p></div></header>
        <label>招聘系统<select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}>{AUTOMATED_PROVIDERS.map((provider) => <option value={provider.id} key={provider.id}>{provider.name}</option>)}</select></label>
        <label>公司名称<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如 Example AI" required/></label>
        <label>站点标识<input value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} placeholder={currentProvider.hint} required/></label>
        <label>岗位关键词<textarea rows={3} value={form.keywords} onChange={(event) => setForm({ ...form, keywords: event.target.value })}/></label>
        <label>地点范围<textarea rows={2} value={form.locations} onChange={(event) => setForm({ ...form, locations: event.target.value })}/></label>
        <label className="platform-checkbox"><input type="checkbox" checked={form.internships_only} onChange={(event) => setForm({ ...form, internships_only: event.target.checked })}/>只拉取实习岗位</label>
        <label className="platform-checkbox"><input type="checkbox" checked={form.scope === "shared"} onChange={(event) => setForm({ ...form, scope: event.target.checked ? "shared" : "private" })}/>共享到平台岗位池（公开岗位，全体用户可见）</label>
        <button className="primary-button" type="submit" disabled={busy === "add"}><Plus size={15}/>{busy === "add" ? "保存中…" : "保存来源"}</button>
      </form>
    </div>

    <section className="platform-panel">
      <header className="platform-panel-head"><div><h2>其他招聘平台</h2><p>没有稳定公开读取接口时，通过真实链接和 JD 进入同一岗位池；不会绕过平台登录、验证码或反机器人机制。</p></div><Link href="/jobs#import-job">导入岗位<Link2 size={15}/></Link></header>
      <div className="platform-link-platforms">{LINK_IMPORT_PLATFORMS.map(([name, copy]) => <article key={name}><ExternalLink size={18}/><span><strong>{name}</strong><small>{copy}</small></span></article>)}</div>
      <div className="platform-compliance-note"><ShieldCheck size={18}/><span><strong>聚合边界</strong><small>公开读取接口用于发现岗位；最终投递仍需要用户确认，并在招聘平台允许的登录状态中完成。</small></span></div>
    </section>

    <section className="platform-panel platform-run-history"><header className="platform-panel-head"><div><h2>最近聚合任务</h2><p>可查看岗位池为什么增长、没有增长或出现错误。</p></div></header>{runs.length ? runs.slice(0, 10).map((run) => <div key={run.id}><span>{run.trigger_type === "cron" ? "定时" : "手动"}</span><strong>{run.status}</strong><small>来源 {run.source_count} · 扫描 {run.jobs_seen} · 新增 {run.jobs_imported} · 更新 {run.jobs_updated} · 跳过 {run.jobs_skipped}</small><time>{new Date(run.started_at).toLocaleString("zh-CN")}</time></div>) : <p className="platform-muted">尚未运行岗位聚合。</p>}</section>
  </section>;
}
