"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, DatabaseZap, Plus, RefreshCw } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Evidence = {
  id: string;
  skill: string;
  project: string;
  evidence: string;
  confidence: number;
  verification_status: string;
  source_url?: string | null;
  created_at: string;
};

export function CareerVaultWorkspace() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ skill: "", project: "", evidence: "", source_url: "", verification_status: "verified" });

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const result = await controlFetch<{ evidence: Evidence[] }>("/api/control/career-vault");
      setItems(result.evidence ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await controlFetch("/api/control/career-vault", { method: "POST", body: JSON.stringify(form) });
      setForm({ skill: "", project: "", evidence: "", source_url: "", verification_status: "verified" });
      setMessage("证据已写入 Career Vault。");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally { setBusy(false); }
  }

  return <div className="control-grid vault-layout">
    <section className="control-panel">
      <header className="control-heading"><div><span className="eyebrow">Verified facts only</span><h2>Career Vault</h2><p>材料生成只引用已核验且启用的证据。</p></div><button className="icon-button" onClick={()=>void load()} disabled={busy}><RefreshCw size={15}/></button></header>
      {message ? <div className="control-message">{message}</div> : null}
      <div className="vault-list">
        {items.length === 0 ? <div className="empty-state"><DatabaseZap size={24}/><strong>还没有项目证据</strong><span>先添加 3–8 条可面试解释、可在仓库或文档中验证的事实。</span></div> : items.map((item)=><article className="evidence-card" key={item.id}>
          <div className="evidence-top"><strong>{item.skill}</strong><span className={`status ${item.verification_status === "verified" ? "verified" : "pending"}`}>{item.verification_status}</span></div>
          <h3>{item.project}</h3><p>{item.evidence}</p>
          <footer><span>可信度 {item.confidence}%</span>{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer">查看来源</a> : <span>手动核验</span>}</footer>
        </article>)}
      </div>
    </section>
    <form className="control-panel control-form sticky-panel" onSubmit={submit}>
      <div><span className="eyebrow">Add evidence</span><h2>新增真实证据</h2><p>不要填写计划、推测或无法展示的结果。</p></div>
      <label>技能<input value={form.skill} onChange={(e)=>setForm({...form,skill:e.target.value})} placeholder="例如 FastAPI" required/></label>
      <label>项目<input value={form.project} onChange={(e)=>setForm({...form,project:e.target.value})} placeholder="例如 Camera Market Strategy System" required/></label>
      <label>可验证事实<textarea value={form.evidence} onChange={(e)=>setForm({...form,evidence:e.target.value})} placeholder="行动 + 技术/方法 + 已验证结果" required rows={6}/></label>
      <label>公开来源（可选）<input value={form.source_url} onChange={(e)=>setForm({...form,source_url:e.target.value})} placeholder="GitHub、文档或 Demo URL"/></label>
      <label>核验状态<select value={form.verification_status} onChange={(e)=>setForm({...form,verification_status:e.target.value})}><option value="verified">已核验</option><option value="draft">草稿，不用于材料生成</option></select></label>
      <button className="primary-button" type="submit" disabled={busy}><Plus size={15}/>{busy ? "保存中…" : "加入证据库"}</button>
      <div className="safety-note"><CheckCircle2 size={15}/><span>未核验证据会被规则引擎自动排除。</span></div>
    </form>
  </div>;
}
