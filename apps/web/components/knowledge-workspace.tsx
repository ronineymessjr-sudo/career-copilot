"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, BookOpenCheck, CheckCircle2, FileSearch, FileUp, PauseCircle, RefreshCw, Search, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Row = Record<string, any>;

type DocumentForm = {
  title: string;
  source_type: string;
  source_url: string;
  content: string;
  mime_type: string;
  original_filename: string;
};

const emptyForm: DocumentForm = {
  title: "",
  source_type: "text",
  source_url: "",
  content: "",
  mime_type: "text/plain",
  original_filename: "",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function scoreLabel(value: unknown) {
  const score = Number(value ?? 0);
  return Number.isFinite(score) ? `${Math.round(score * 100)}%` : "-";
}

export function KnowledgeWorkspace() {
  const [documents, setDocuments] = useState<Row[]>([]);
  const [workflows, setWorkflows] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [retrievalMode, setRetrievalMode] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<DocumentForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const [documentPayload, workflowPayload] = await Promise.all([
        controlFetch<{ documents: Row[] }>("/api/control/knowledge/documents"),
        controlFetch<{ workflows: Row[] }>("/api/control/workflows"),
      ]);
      setDocuments(documentPayload.documents ?? []);
      setWorkflows(workflowPayload.workflows ?? []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "知识库加载失败");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = useMemo(
    () => workflows.filter((item) => item.workflow_type === "evidence_promotion" && item.status === "waiting_for_human"),
    [workflows],
  );

  async function readFile(file?: File) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "md", "markdown", "json", "csv"].includes(extension)) {
      setMessage("当前浏览器导入只支持 TXT、Markdown、JSON 和 CSV。PDF/DOCX 请先提取文本后粘贴，系统不会伪装解析。 ");
      return;
    }
    const content = await file.text();
    const sourceType = extension === "md" || extension === "markdown" ? "markdown" : extension === "json" ? "json" : extension === "csv" ? "csv" : "text";
    setForm((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.[^.]+$/, ""),
      content,
      source_type: sourceType,
      mime_type: file.type || "text/plain",
      original_filename: file.name,
    }));
    setMessage(`已读取 ${file.name}，提交前可继续检查和编辑文本。`);
  }

  async function ingest(event: FormEvent) {
    event.preventDefault();
    setBusy("ingest");
    try {
      const response = await controlFetch<{ embedding_mode: string; chunks: number; deduplicated?: boolean; warning?: string | null }>("/api/control/knowledge/documents", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(response.deduplicated ? "相同内容已经存在，未重复写入。" : `文档已分为 ${response.chunks} 个片段，检索模式：${response.embedding_mode}。${response.warning ? "向量生成失败，已安全降级为词法检索。" : ""}`);
      setForm(emptyForm);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文档导入失败");
    } finally { setBusy(""); }
  }

  async function search(event?: FormEvent) {
    event?.preventDefault();
    if (!query.trim()) return;
    setBusy("search");
    try {
      const response = await controlFetch<{ results: Row[]; retrieval_mode: string }>("/api/control/knowledge/search", {
        method: "POST",
        body: JSON.stringify({ query, limit: 10 }),
      });
      setResults(response.results ?? []);
      setRetrievalMode(response.retrieval_mode ?? "lexical");
      setMessage(response.results?.length ? `找到 ${response.results.length} 个带来源片段。检索结果仍不是已核验证据。` : "没有找到相关片段。尝试换一个更具体的技能、项目或结果关键词。 ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "检索失败");
    } finally { setBusy(""); }
  }

  async function updateDocument(item: Row, status: "active" | "archived") {
    setBusy(`doc-${item.id}`);
    try {
      await controlFetch(`/api/control/knowledge/documents/${item.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(status === "archived" ? "文档已归档，不再参与检索。" : "文档已重新启用。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "更新失败"); }
    finally { setBusy(""); }
  }

  async function removeDocument(item: Row) {
    if (!window.confirm(`删除文档“${item.title}”及其全部分块？已晋升到 Career Vault 的证据不会被自动删除。`)) return;
    setBusy(`doc-${item.id}`);
    try {
      await controlFetch(`/api/control/knowledge/documents/${item.id}`, { method: "DELETE" });
      setResults((current) => current.filter((result) => String(result.document_id) !== String(item.id)));
      setMessage("文档和检索分块已删除。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "删除失败"); }
    finally { setBusy(""); }
  }

  async function promote(item: Row) {
    const skill = window.prompt("准备晋升为什么技能证据？", item.heading || query || "")?.trim() ?? "";
    if (!skill) return;
    const project = window.prompt("关联哪个项目或经历？", item.document_title || "")?.trim() ?? "";
    if (!project) return;
    const evidence = window.prompt("请检查并改写为可验证事实。不要写计划或推测。", item.content)?.trim() ?? "";
    if (!evidence) return;
    setBusy(`promote-${item.id}`);
    try {
      await controlFetch("/api/control/workflows/evidence-promotion", {
        method: "POST",
        body: JSON.stringify({ chunk_id: item.id, skill, project, evidence }),
      });
      setMessage("证据晋升工作流已暂停在人工审核节点。只有你明确批准后才会进入 Career Vault。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "工作流创建失败"); }
    finally { setBusy(""); }
  }

  async function resolveWorkflow(item: Row, action: "approve" | "edit" | "reject") {
    const candidate = item.interrupt_payload?.candidate ?? item.state?.candidate ?? {};
    let payload: Row = { type: action };
    if (action === "edit") {
      const skill = window.prompt("技能", candidate.skill ?? "")?.trim() ?? "";
      const project = window.prompt("项目或经历", candidate.project ?? "")?.trim() ?? "";
      const evidence = window.prompt("最终可验证事实", candidate.evidence ?? "")?.trim() ?? "";
      if (!skill || !project || !evidence) return;
      payload = { type: action, edited: { skill, project, evidence } };
    }
    if (action === "approve" && !window.confirm("确认该事实真实、可解释并可被来源片段支持？批准后它会作为 verified 证据进入 Career Vault。")) return;
    setBusy(`workflow-${item.id}`);
    try {
      await controlFetch(`/api/control/workflows/${item.id}/resume`, { method: "POST", body: JSON.stringify(payload) });
      setMessage(action === "reject" ? "候选证据已拒绝，没有写入 Career Vault。" : "已完成审核。证据由你的明确决定晋升，系统没有自动批准。 ");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "工作流恢复失败"); }
    finally { setBusy(""); }
  }

  return <section className="control-panel knowledge-panel">
    <header className="control-heading"><div><span className="eyebrow">Cited knowledge · human verified</span><h2>Career Vault 知识检索</h2><p>导入文档、检索带来源片段，再通过可恢复人工审批把真实事实晋升到 Career Vault。</p></div><button className="icon-button" onClick={() => void load()}><RefreshCw size={15}/></button></header>
    {message ? <div className="control-message">{message}</div> : null}

    <div className="knowledge-summary-grid">
      <article><BookOpenCheck size={18}/><strong>{documents.length}</strong><span>知识文档</span></article>
      <article><FileSearch size={18}/><strong>{documents.reduce((sum, item) => sum + Number(item.chunk_count ?? 0), 0)}</strong><span>可溯源分块</span></article>
      <article><PauseCircle size={18}/><strong>{pending.length}</strong><span>等待人工审核</span></article>
    </div>

    <div className="knowledge-layout">
      <div className="knowledge-main">
        <form className="knowledge-search" onSubmit={search}>
          <Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索技能、项目、技术决策或可量化结果"/><button className="primary-button" disabled={!query.trim() || busy === "search"}>{busy === "search" ? "检索中…" : "检索"}</button>
        </form>
        {retrievalMode ? <div className="retrieval-proof"><ShieldCheck size={14}/><span>本次使用 {retrievalMode === "vector" ? "pgvector 语义检索" : "词法回退检索"}；所有结果仍需人工核验。</span></div> : null}
        <div className="knowledge-results">
          {results.length === 0 ? <div className="empty-state"><FileSearch size={25}/><strong>等待一次有目标的检索</strong><span>例如“FastAPI 异步任务”“RAG 引用与防幻觉”或“部署性能结果”。</span></div> : results.map((item) => <article key={item.id} className="knowledge-result-card">
            <div className="knowledge-result-head"><div><span>{item.document_title ?? "未命名文档"}</span><h3>{item.heading || `分块 ${Number(item.chunk_index ?? 0) + 1}`}</h3></div><strong>{scoreLabel(item.similarity ?? item.score)}</strong></div>
            <p>{item.content}</p>
            <footer><div><code>{item.content_hash?.slice(0, 12)}</code><span>字符 {item.char_start ?? "-"}–{item.char_end ?? "-"}</span></div>{item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer">查看原始来源</a> : <span>用户导入文本</span>}</footer>
            <button className="ghost-button" disabled={busy === `promote-${item.id}`} onClick={() => void promote(item)}><CheckCircle2 size={14}/>发起证据晋升</button>
          </article>)}
        </div>
      </div>

      <aside className="knowledge-side">
        <form className="control-form knowledge-ingest" onSubmit={ingest}>
          <div><span className="eyebrow">Document ingestion</span><h3>导入知识文档</h3><p>支持直接粘贴，或读取 TXT、Markdown、JSON、CSV。</p></div>
          <label className="file-picker"><FileUp size={16}/><span>{form.original_filename || "选择文本文件"}</span><input type="file" accept=".txt,.md,.markdown,.json,.csv,text/plain,text/markdown,application/json,text/csv" onChange={(event) => void readFile(event.target.files?.[0])}/></label>
          <label>标题<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required/></label>
          <label>类型<select value={form.source_type} onChange={(event) => setForm({ ...form, source_type: event.target.value })}><option value="resume">简历</option><option value="project">项目文档</option><option value="note">笔记</option><option value="markdown">Markdown</option><option value="json">JSON</option><option value="csv">CSV</option><option value="text">文本</option><option value="other">其他</option></select></label>
          <label>来源 URL（可选）<input value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="GitHub、Demo 或文档链接"/></label>
          <label>正文<textarea rows={10} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="粘贴可核验的简历、项目说明、复盘或技术文档" required/></label>
          <button className="primary-button" disabled={busy === "ingest" || !form.title.trim() || !form.content.trim()}><FileUp size={14}/>{busy === "ingest" ? "分块处理中…" : "导入并建立索引"}</button>
          <div className="safety-note"><ShieldCheck size={15}/><span>检索片段不是事实。未经明确审批，不会自动进入 Career Vault。</span></div>
        </form>

        <section className="knowledge-documents"><div><span className="eyebrow">Documents</span><h3>文档索引</h3></div>{documents.length === 0 ? <p className="muted-copy">暂无文档。</p> : documents.slice(0, 20).map((item) => <article key={item.id}><div><strong>{item.title}</strong><span className={`status ${item.status === "active" ? "verified" : "pending"}`}>{item.status}</span></div><p>{item.chunk_count ?? 0} 分块 · {item.embedding_provider === "openai" ? item.embedding_model : "词法索引"}</p><small>{formatDate(item.updated_at)}</small><div>{item.status === "archived" ? <button onClick={() => void updateDocument(item, "active")}>重新启用</button> : <button onClick={() => void updateDocument(item, "archived")}><Archive size={13}/>归档</button>}<button className="danger" onClick={() => void removeDocument(item)}><Trash2 size={13}/>删除</button></div></article>)}</section>
      </aside>
    </div>

    <section className="workflow-review-panel"><header><div><span className="eyebrow">Durable human interrupts</span><h3>等待审核的证据工作流</h3><p>页面关闭后仍可恢复；来源片段发生变化时，旧审批会被阻止。</p></div></header>{pending.length === 0 ? <div className="empty-state compact"><CheckCircle2 size={22}/><strong>没有待审核工作流</strong><span>从检索结果中发起一次证据晋升。</span></div> : pending.map((item) => {
      const candidate = item.interrupt_payload?.candidate ?? item.state?.candidate ?? {};
      const citation = item.interrupt_payload?.citation ?? item.state?.citation ?? {};
      return <article key={item.id}><div className="workflow-candidate"><span>{candidate.skill}</span><h4>{candidate.project}</h4><p>{candidate.evidence}</p><small>{citation.document_title} · {citation.citation_id}</small></div><div className="workflow-actions"><button className="ghost-button danger" disabled={busy === `workflow-${item.id}`} onClick={() => void resolveWorkflow(item, "reject")}><XCircle size={14}/>拒绝</button><button className="ghost-button" disabled={busy === `workflow-${item.id}`} onClick={() => void resolveWorkflow(item, "edit")}><FileSearch size={14}/>编辑后批准</button><button className="primary-button" disabled={busy === `workflow-${item.id}`} onClick={() => void resolveWorkflow(item, "approve")}><CheckCircle2 size={14}/>确认真实并批准</button></div></article>;
    })}</section>
  </section>;
}
