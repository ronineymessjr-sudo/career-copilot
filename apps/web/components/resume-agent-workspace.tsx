"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Copy, Database, Download, FileCheck2, FilePlus2, Layers, LoaderCircle, RefreshCw, Save, Sparkles, Star, Trash2, Upload, X } from "lucide-react";
import { authorizedFetch, controlDownload, controlFetch } from "@/lib/control-client";

type Row = Record<string, any>;
type ResumePayload = { resumes: Row[]; storage: { bucket: string; visibility: string; metadata_table: string } };

function bytes(value: unknown) {
  const size = Number(value ?? 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function sourceLabel(source: string) {
  return ({ uploaded: "上传文件", manual: "手动建立", profile: "由画像建立", generated: "岗位定制", legacy: "历史版本" } as Record<string, string>)[source] || "历史版本";
}

function ResumeCompare({ left, right, onClear }: { left: Row | null; right: Row | null; onClear: () => void }) {
  if (!left || !right) return null;
  function skills(value: Row) { return (value?.content?.skills ?? []).join("、") || "—"; }
  function projects(value: Row) { return (value?.content?.projects ?? []).map((item: Row) => String(item?.project ?? item?.title ?? "")).filter(Boolean).join("；") || "—"; }
  function sourceLabel(value: Row) { return value?.source_type === "generated" ? "岗位定制" : value?.source_type === "profile" ? "由画像建立" : value?.source_type === "manual" ? "手动建立" : value?.source_type === "uploaded" ? "上传文件" : "历史版本"; }
  function diffStyle(a: string, b: string) { return a !== b ? { background: "#fff3cd", fontWeight: 700 } : undefined; }
  const leftSummary = String(left.content?.summary ?? left.notes ?? "—");
  const rightSummary = String(right.content?.summary ?? right.notes ?? "—");
  const leftSkills = skills(left); const rightSkills = skills(right);
  const leftProjects = projects(left); const rightProjects = projects(right);
  return <div className="resume-compare">
    <header><div><h2>版本对比</h2><p>差异项用黄色高亮标记。</p></div><button className="ghost-button compact" type="button" onClick={onClear}><X size={14}/>关闭对比</button></header>
    <div className="resume-compare-grid">
      <article><h3>{left.name}</h3><span>{sourceLabel(left)} · v{left.version_no ?? 1}</span><p><b>方向</b>{left.role_family || "—"}</p><p style={diffStyle(leftSummary, rightSummary)}><b>摘要</b>{leftSummary}</p><p style={diffStyle(leftSkills, rightSkills)}><b>技能</b>{leftSkills}</p><p style={diffStyle(leftProjects, rightProjects)}><b>项目</b>{leftProjects}</p></article>
      <article><h3>{right.name}</h3><span>{sourceLabel(right)} · v{right.version_no ?? 1}</span><p><b>方向</b>{right.role_family || "—"}</p><p style={diffStyle(leftSummary, rightSummary)}><b>摘要</b>{rightSummary}</p><p style={diffStyle(leftSkills, rightSkills)}><b>技能</b>{rightSkills}</p><p style={diffStyle(leftProjects, rightProjects)}><b>项目</b>{rightProjects}</p></article>
    </div>
  </div>;
}

function ResumeCard({ resume, busy, onReload, compareSelected, onToggleCompare, onCopyCopy }: { resume: Row; busy: string; onReload: () => Promise<void>; compareSelected: boolean; onToggleCompare: () => void; onCopyCopy: (resume: Row) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: String(resume.name ?? ""), role_family: String(resume.role_family ?? ""), summary: String(resume.content?.summary ?? ""), skills: (resume.content?.skills ?? []).join("、"), notes: String(resume.notes ?? "") });

  async function patch(values: Record<string, unknown>, message: string) {
    await controlFetch(`/api/control/resumes/${resume.id}`, { method: "PATCH", body: JSON.stringify(values) });
    await onReload();
    return message;
  }

  async function remove() {
    if (!window.confirm(`确认删除简历版本“${resume.name}”？上传的原始文件也会一并删除。`)) return;
    await controlFetch(`/api/control/resumes/${resume.id}`, { method: "DELETE" });
    await onReload();
  }

  const skills = resume.content?.skills ?? [];
  const qualityGate = resume.content?.draft_quality_gate;
  const qualityLabel = ({ blocked: "已阻塞", needs_review: "待复核", ready_for_review: "可复核" } as Record<string, string>)[String(qualityGate?.status ?? "")] ?? "未评估";
  const claimMap = Array.isArray(resume.content?.claim_map) ? resume.content.claim_map : [];
  return <article className={`resume-library-card ${resume.is_master ? "master" : ""}`}>
    <header>
      <div className="resume-library-title"><span className="resume-source">{sourceLabel(String(resume.source_type ?? "legacy"))}</span><h3>{resume.name}</h3><p>{resume.role_family || "通用方向"}</p></div>
      <div className="resume-library-badges">{resume.is_master ? <span className="master-badge"><Star size={13}/>主简历</span> : null}<span className={`platform-status ${resume.status === "approved" ? "ok" : resume.status === "archived" ? "done" : "warn"}`}>{resume.status === "approved" ? "可使用" : resume.status === "archived" ? "已归档" : "草稿"}</span></div>
    </header>
    <div className="resume-library-meta">
      <span>版本 v{resume.version_no ?? 1}</span>
      {resume.original_filename ? <span>{resume.original_filename}</span> : null}
      {resume.file_size ? <span>{bytes(resume.file_size)}</span> : null}
      {resume.target_job ? <span>{resume.target_job.company_name} · {resume.target_job.title}</span> : null}
      <span>更新于 {resume.updated_at ? new Date(resume.updated_at).toLocaleDateString("zh-CN") : "--"}</span>
    </div>
    {resume.content?.summary ? <p className="resume-library-summary">{resume.content.summary}</p> : resume.notes ? <p className="resume-library-summary">{resume.notes}</p> : <p className="resume-library-summary muted">该版本尚未填写结构化摘要，可通过“编辑信息”补充。</p>}
    {skills.length ? <div className="resume-library-skills">{skills.slice(0, 10).map((skill: string) => <span key={skill}>{skill}</span>)}</div> : null}
    {resume.alignment?.alignment_score != null ? <div className="resume-alignment-line"><CheckCircle2 size={15}/><span>最近岗位匹配度 {resume.alignment.alignment_score}%</span></div> : null}
    {qualityGate ? <div className={`resume-claim-line ${String(qualityGate.status ?? "")}`}><FileCheck2 size={15}/><span>证据门禁：{qualityLabel} · 已选 {Number(qualityGate.selected_evidence_count ?? 0)} 条 · 待复核 {Number(qualityGate.blocking_claim_count ?? 0)} 项</span></div> : null}
    {claimMap.length ? <details className="resume-claim-details"><summary>查看证据对照（{claimMap.length} 项）</summary><div>{claimMap.slice(0, 12).map((claim: Row, index: number) => <p key={`${String(claim.evidence_id ?? claim.claim)}-${index}`}><span className={`claim-status ${String(claim.status ?? "")}`}>{String(claim.status ?? "待确认")}</span><strong>{String(claim.claim ?? "")}</strong>{claim.project ? <small>{String(claim.project)}</small> : null}</p>)}</div></details> : null}

    {editing ? <form className="resume-edit-form" onSubmit={async (event) => { event.preventDefault(); await patch({ name: draft.name, role_family: draft.role_family, notes: draft.notes, content: { ...(resume.content ?? {}), summary: draft.summary, skills: draft.skills.split(/[,，\n、]/).map((item: string) => item.trim()).filter(Boolean) } }, "已保存"); setEditing(false); }}>
      <label>版本名称<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
      <label>适用方向<input value={draft.role_family} onChange={(event) => setDraft({ ...draft, role_family: event.target.value })}/></label>
      <label className="full">简历摘要<textarea rows={3} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="概括这份版本的核心经历和适用岗位"/></label>
      <label className="full">技能关键词<input value={draft.skills} onChange={(event) => setDraft({ ...draft, skills: event.target.value })} placeholder="Python、React、数据分析"/></label>
      <label className="full">备注<textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })}/></label>
      <div><button className="primary-button compact" type="submit"><Save size={14}/>保存</button><button className="ghost-button compact" type="button" onClick={() => setEditing(false)}>取消</button></div>
    </form> : null}

    <footer className="resume-library-actions">
      {resume.download_url ? <button className="ghost-button compact" type="button" onClick={() => void controlDownload(resume.download_url, resume.original_filename || `${resume.name}.pdf`)}><Download size={14}/>下载原文件</button> : null}
      <button className="ghost-button compact" type="button" disabled={!resume.target_job || busy === `copy-${resume.id}`} onClick={() => void onCopyCopy(resume)}><Copy size={14}/>复制投递文案</button>
      <button className={`ghost-button compact${compareSelected ? " active" : ""}`} type="button" onClick={onToggleCompare}><CheckCircle2 size={14}/>{compareSelected ? "已加入对比" : "加入对比"}</button>
      <button className="ghost-button compact" type="button" onClick={() => setEditing((value) => !value)}>编辑信息</button>
      {!resume.is_master && resume.status !== "archived" ? <button className="ghost-button compact" type="button" disabled={busy === resume.id} onClick={() => void patch({ is_master: true, status: "approved" }, "已设为主简历")}><Star size={14}/>设为主简历</button> : null}
      {resume.status === "draft" ? <button className="ghost-button compact" type="button" onClick={() => void patch({ status: "approved" }, "已批准")}>批准使用</button> : null}
      {resume.status !== "archived" ? <button className="ghost-button compact" type="button" onClick={() => void patch({ status: "archived" }, "已归档")}><Archive size={14}/>归档</button> : <button className="ghost-button compact" type="button" onClick={() => void patch({ status: "draft" }, "已恢复")}>恢复</button>}
      <button className="icon-button danger" type="button" aria-label="删除简历" onClick={() => void remove()}><Trash2 size={15}/></button>
    </footer>
  </article>;
}

export function ResumeAgentWorkspace() {
  const [resumes, setResumes] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [storage, setStorage] = useState({ bucket: "resume-files", visibility: "private", metadata_table: "resume_versions" });
  const [jobId, setJobId] = useState("");
  const [persona, setPersona] = useState("agent_engineer");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [upload, setUpload] = useState({ name: "", role_family: "", summary: "", skills: "", notes: "", is_master: false, file: null as File | null });
  const [compareIds, setCompareIds] = useState<string[]>([]);

  function toggleCompare(id: string) {
    setCompareIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 2 ? [current[1], id] : [...current, id]);
  }

  async function copyCopy(resume: Row) {
    const job = resume.target_job;
    if (!job?.id) { setMessage("该版本还没有关联岗位，无法生成投递文案。请先用“生成岗位定制版本”关联岗位。"); return; }
    setBusy(`copy-${resume.id}`);
    try {
      const plan = await controlFetch<{ plan: Record<string, any> }>(`/api/control/jobs/${job.id}/apply-plan`, { method: "POST" });
      const greeting = String(plan.plan?.greeting ?? plan.plan?.recruiter_greeting ?? "");
      const emailBody = String(plan.plan?.email_body ?? "");
      const subject = String(plan.plan?.email_subject ?? "");
      const text = [subject && `主题：${subject}`, greeting, emailBody].filter(Boolean).join("\n\n");
      if (!text.trim()) { setMessage("没有可复制的投递文案（可能岗位缺少真实投递入口）。"); return; }
      await navigator.clipboard.writeText(text);
      setMessage(`已复制「${resume.name}」的投递文案到剪贴板。`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "生成投递文案失败"); }
    finally { setBusy(""); }
  }

  const load = useCallback(async () => {
    try {
      const [resumePayload, jobPayload] = await Promise.all([
        controlFetch<ResumePayload>("/api/control/resumes"),
        controlFetch<{ jobs: Row[] }>("/api/control/jobs"),
      ]);
      setResumes(resumePayload.resumes ?? []);
      setStorage(resumePayload.storage ?? storage);
      setJobs(jobPayload.jobs ?? []);
      setJobId((current) => current || String(jobPayload.jobs?.[0]?.id ?? ""));
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "简历加载失败"); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeResumes = useMemo(() => resumes.filter((item) => item.status !== "archived"), [resumes]);
  const archivedResumes = useMemo(() => resumes.filter((item) => item.status === "archived"), [resumes]);
  const master = activeResumes.find((item) => item.is_master);

  async function generate(event: FormEvent) {
    event.preventDefault();
    setBusy("generate");
    try {
      await controlFetch("/api/control/resumes", { method: "POST", body: JSON.stringify({ action: "generate", job_id: jobId, persona }) });
      setMessage("岗位定制简历草稿已生成，已进入多版本简历库。请检查内容后批准使用。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败"); }
    finally { setBusy(""); }
  }

  async function batchGenerate() {
    const targets = jobs.filter((job) => job.id && job.company_name);
    if (!targets.length) { setMessage("岗位池还没有岗位，先聚合或导入岗位后再批量生成。"); return; }
    setBusy("batch");
    setMessage(`正在用「${personaLabel(persona)}」为 ${targets.length} 个岗位批量生成简历版本，请稍候…`);
    let ok = 0; let failed = 0;
    for (const job of targets) {
      try {
        await controlFetch("/api/control/resumes", { method: "POST", body: JSON.stringify({ action: "generate", job_id: String(job.id), persona }) });
        ok += 1;
      } catch { failed += 1; }
    }
    setMessage(`批量生成完成：成功 ${ok} 个，失败 ${failed} 个。新版本已进入简历库，请检查后批准使用。`);
    await load();
    setBusy("");
  }

  function personaLabel(value: string) {
    return ({ agent_engineer: "工程研发版", ai_product: "产品与运营版", operations: "运营与增长版", ai_solution: "解决方案与商务版", local_transition: "通用岗位版", legal: "法律与法务版", hr: "人力资源版", finance: "财务与会计版", admin: "行政与支持版", engineering: "工科工程版", photo_video: "摄影与视频版", live_streaming: "主播与直播版", ai_research: "AI 研究与算法版" } as Record<string, string>)[value] || value;
  }

  async function createFromProfile() {
    setBusy("profile");
    try {
      await controlFetch("/api/control/resumes", { method: "POST", body: JSON.stringify({ action: "create_from_profile", is_master: !master, status: "approved" }) });
      setMessage(master ? "已从完整画像建立新的通用简历版本。" : "已从完整画像建立主简历。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "建立失败"); }
    finally { setBusy(""); }
  }

  async function uploadFile(event: FormEvent) {
    event.preventDefault();
    if (!upload.file) { setMessage("请先选择 PDF、DOC、DOCX 或 TXT 简历文件。"); return; }
    setBusy("upload");
    try {
      const form = new FormData();
      form.set("file", upload.file);
      form.set("name", upload.name || upload.file.name.replace(/\.[^.]+$/, ""));
      form.set("role_family", upload.role_family || "通用简历");
      form.set("summary", upload.summary);
      form.set("skills", upload.skills);
      form.set("notes", upload.notes);
      form.set("is_master", String(upload.is_master));
      const response = await authorizedFetch("/api/control/resumes/upload", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error ?? `上传失败（${response.status}）`);
      setUpload({ name: "", role_family: "", summary: "", skills: "", notes: "", is_master: false, file: null });
      const input = document.getElementById("resume-file-input") as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage("原始简历已上传到个人私有存储，并已建立可使用版本。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "上传失败"); }
    finally { setBusy(""); }
  }

  return <section className="platform-workspace resume-library-page">
    <header className="platform-page-head"><div><h1>多版本简历库</h1><p>保存原始文件、主简历、通用版本和岗位定制版本。投递时系统从可使用版本中自动选择匹配度最高的一份。</p></div><button className="platform-refresh" onClick={() => void load()}><RefreshCw size={16}/>刷新</button></header>
    {message ? <div className="platform-message" role="status">{message}</div> : null}

    <section className="resume-storage-strip">
      <article><Database size={18}/><span><strong>结构化简历</strong><small>Supabase 表：{storage.metadata_table}</small></span></article>
      <article><FileCheck2 size={18}/><span><strong>原始文件</strong><small>私有存储桶：{storage.bucket}</small></span></article>
      <article><Star size={18}/><span><strong>当前主简历</strong><small>{master?.name ?? "尚未设置"}</small></span></article>
      <article><strong>{activeResumes.length}</strong><span><small>可使用版本</small></span></article>
    </section>

    <div className="resume-create-grid">
      <form className="platform-panel resume-upload-panel" onSubmit={uploadFile}>
        <header><Upload size={20}/><div><h2>上传已有简历</h2><p>支持 PDF、DOC、DOCX、TXT，最大 10MB。文件仅当前账号可读取。</p></div></header>
        <label>选择文件<input id="resume-file-input" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => setUpload({ ...upload, file: event.target.files?.[0] ?? null })} required/></label>
        <div className="platform-form-grid two">
          <label>版本名称<input value={upload.name} onChange={(event) => setUpload({ ...upload, name: event.target.value })} placeholder="例如：后端开发主简历"/></label>
          <label>适用方向<input value={upload.role_family} onChange={(event) => setUpload({ ...upload, role_family: event.target.value })} placeholder="后端 / AI 应用 / 产品"/></label>
          <label className="full">简短说明<input value={upload.summary} onChange={(event) => setUpload({ ...upload, summary: event.target.value })} placeholder="这份简历最适合哪些岗位"/></label>
          <label className="full">技能关键词<input value={upload.skills} onChange={(event) => setUpload({ ...upload, skills: event.target.value })} placeholder="Python、LangGraph、React；用于自动匹配 PDF/DOCX"/></label>
          <label className="platform-checkbox full"><input type="checkbox" checked={upload.is_master} onChange={(event) => setUpload({ ...upload, is_master: event.target.checked })}/>上传后设为主简历</label>
        </div>
        <button className="primary-button" type="submit" disabled={busy === "upload"}><Upload size={15}/>{busy === "upload" ? "上传中…" : "上传并保存版本"}</button>
      </form>

      <section className="platform-panel resume-create-panel">
        <header><FilePlus2 size={20}/><div><h2>从完整画像建立简历</h2><p>把你在“我的画像”中保存的教育、经历、项目和技能建立为一份结构化简历。</p></div></header>
        <button className="primary-button" type="button" onClick={() => void createFromProfile()} disabled={busy === "profile"}><FilePlus2 size={15}/>{busy === "profile" ? "建立中…" : master ? "建立新的通用版本" : "建立主简历"}</button>
        <Link href="/profile" className="ghost-button">先完善完整画像</Link>
      </section>
    </div>

    <section className="platform-panel resume-target-panel">
      <header><Sparkles size={20}/><div><h2>生成岗位定制版本</h2><p>系统读取岗位、主简历和已核验项目证据，生成新的草稿版本，不覆盖原简历。</p></div></header>
      <form onSubmit={generate}>
        <label>目标岗位<select value={jobId} onChange={(event) => setJobId(event.target.value)} required><option value="">请选择岗位</option>{jobs.map((job) => <option value={job.id} key={job.id}>{job.company_name} · {job.title}</option>)}</select></label>
        <label>版本方向<select value={persona} onChange={(event) => setPersona(event.target.value)}><option value="agent_engineer">工程研发版</option><option value="ai_product">产品与运营版</option><option value="operations">运营与增长版</option><option value="ai_solution">解决方案与商务版</option><option value="ai_research">AI 研究与算法版</option><option value="engineering">工科工程版</option><option value="photo_video">摄影与视频版</option><option value="live_streaming">主播与直播版</option><option value="legal">法律与法务版</option><option value="hr">人力资源版</option><option value="finance">财务与会计版</option><option value="admin">行政与支持版</option><option value="local_transition">通用岗位版</option></select></label>
        <button className="primary-button" disabled={busy === "generate" || !jobId}><Sparkles size={14}/>{busy === "generate" ? "生成中…" : "生成新版本"}</button>
      </form>
      <div className="resume-batch-actions">
        <button className="ghost-button" type="button" disabled={busy === "batch" || jobs.length === 0} onClick={() => void batchGenerate()}>{busy === "batch" ? <LoaderCircle className="spin" size={14}/> : <Layers size={14}/>}用当前档位批量套用到全部岗位（{jobs.length}）</button>
      </div>
    </section>

    <section className="platform-section"><header><h2>全部简历版本</h2><span>{activeResumes.length} 份可使用</span></header>
      {activeResumes.length === 0 ? <div className="platform-empty-guide compact"><FileCheck2 size={25}/><h2>还没有简历版本</h2><p>上传现有简历，或先完善画像后建立主简历。</p></div> : <div className="resume-library-list">{activeResumes.map((resume) => <ResumeCard key={resume.id} resume={resume} busy={busy} onReload={load} compareSelected={compareIds.includes(String(resume.id))} onToggleCompare={() => toggleCompare(String(resume.id))} onCopyCopy={copyCopy}/>)}</div>}
      {compareIds.length === 2 ? <ResumeCompare left={activeResumes.find((item) => String(item.id) === compareIds[0]) ?? null} right={activeResumes.find((item) => String(item.id) === compareIds[1]) ?? null} onClear={() => setCompareIds([])}/> : null}
    </section>

    {archivedResumes.length ? <details className="platform-history resume-archive"><summary><Archive size={16}/>已归档版本 <span>{archivedResumes.length}</span></summary><div className="resume-library-list">{archivedResumes.map((resume) => <ResumeCard key={resume.id} resume={resume} busy={busy} onReload={load} compareSelected={compareIds.includes(String(resume.id))} onToggleCompare={() => toggleCompare(String(resume.id))} onCopyCopy={copyCopy}/>)}</div></details> : null}
    <p className="platform-safety">简历原始文件存放在 Supabase 私有存储桶中；数据库只保存当前账号可见的版本元数据和结构化内容。岗位定制版本永远以新版本保存，不会覆盖主简历。</p>
  </section>;
}
