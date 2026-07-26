"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { FileCheck2, RefreshCw, Sparkles } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Row = Record<string, any>;

export function ResumeAgentWorkspace() {
  const [resumes, setResumes] = useState<Row[]>([]);
  const [jobs, setJobs] = useState<Row[]>([]);
  const [jobId, setJobId] = useState("");
  const [persona, setPersona] = useState("agent_engineer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const [resumePayload, jobPayload] = await Promise.all([
        controlFetch<{ resumes: Row[] }>("/api/control/resumes"),
        controlFetch<{ jobs: Row[] }>("/api/control/jobs"),
      ]);
      setResumes(resumePayload.resumes ?? []);
      setJobs(jobPayload.jobs ?? []);
      setJobId((current) => current || String(jobPayload.jobs?.[0]?.id ?? ""));
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "简历加载失败"); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  async function generate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await controlFetch("/api/control/resumes", { method: "POST", body: JSON.stringify({ job_id: jobId, persona }) });
      setMessage("新简历草稿已生成。请检查每条证据，再进入正式材料审批。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败"); }
    finally { setBusy(false); }
  }
  return <section className="control-panel resume-agent-page">
    <header className="control-heading"><div><span className="eyebrow">Grounded resume personas</span><h2>AI 简历工作室</h2><p>按目标岗位生成研发、产品或解决方案版本。未核验证据永远不会进入简历。</p></div><button className="icon-button" onClick={() => void load()}><RefreshCw size={15}/></button></header>
    {message ? <div className="control-message">{message}</div> : null}
    <div className="resume-agent-layout">
      <form className="control-form" onSubmit={generate}>
        <label>目标岗位<select value={jobId} onChange={(event) => setJobId(event.target.value)} required>{jobs.map((job) => <option value={job.id} key={job.id}>{job.company_name} · {job.title}</option>)}</select></label>
        <label>Persona<select value={persona} onChange={(event) => setPersona(event.target.value)}><option value="agent_engineer">AI Agent 研发版</option><option value="ai_product">AI 产品版</option><option value="ai_solution">AI 解决方案版</option><option value="local_transition">本地过渡版</option></select></label>
        <button className="primary-button" disabled={busy || !jobId}><Sparkles size={14}/>{busy ? "生成中…" : "生成简历草稿"}</button>
        <Link href="/agents" className="ghost-button">查看 Agent Trace 与评测</Link>
      </form>
      <div className="resume-version-cards">
        {resumes.length === 0 ? <div className="empty-state"><FileCheck2 size={25}/><strong>暂无简历版本</strong></div> : resumes.map((resume) => <article key={resume.id}>
          <header><div><span>{resume.persona}</span><h3>{resume.name}</h3></div><strong>{resume.alignment?.alignment_score ?? resume.alignment_summary?.score ?? 0}</strong></header>
          <p>{resume.content?.summary ?? ""}</p>
          <div className="tag-row">{(resume.content?.skills ?? []).slice(0, 8).map((skill: string) => <span key={skill}>{skill}</span>)}</div>
          {(resume.content?.emphasis ?? []).length ? <div className="resume-emphasis">{resume.content.emphasis.map((item: string) => <span key={item}>{item}</span>)}</div> : null}
          {(resume.content?.project_order ?? []).length ? <div className="resume-project-order">项目顺序：{resume.content.project_order.join(" → ")}</div> : null}
          <footer><span>v{resume.version_no} · {resume.status}</span><span>{(resume.evidence_refs ?? []).length} 条已核验证据</span></footer>
        </article>)}
      </div>
    </div>
  </section>;
}
