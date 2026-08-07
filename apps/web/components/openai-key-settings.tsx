"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, KeyRound, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

export function OpenAiKeySettings() {
  const [hasKey, setHasKey] = useState(false);
  const [masked, setMasked] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<{ has_key: boolean; masked: string; source: string | null }>("/api/control/openai-key");
      setHasKey(result.has_key);
      setMasked(result.masked);
      setSource(result.source);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取 Key 状态失败");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!draft.trim()) { setMessage("请先粘贴你的 OpenAI API Key（sk- 开头）"); return; }
    setBusy(true);
    try {
      const result = await controlFetch<{ masked: string }>("/api/control/openai-key", { method: "PUT", body: JSON.stringify({ api_key: draft.trim() }) });
      setMasked(result.masked);
      setHasKey(true);
      setSource("self");
      setDraft("");
      setMessage("Key 已保存。之后聚合搜索会优先使用你自己的 Key，且浏览器无法读回明文。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await controlFetch("/api/control/openai-key", { method: "DELETE" });
      setHasKey(false);
      setMasked("");
      setSource(null);
      setMessage("已删除你的 Key。聚合搜索将回退到平台共享 Key（如已配置）。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return <section className="platform-panel openai-key-settings">
    <header className="platform-panel-head">
      <div><h2><KeyRound size={17}/>OpenAI Key（可选）</h2><p>填你自己的 Key 后，聚合搜索的网页索引平台（BOSS、智联、猎聘等）会用你的 Key 搜索，额度独立、互不消耗。Key 只保存在服务端，浏览器读不回明文。</p></div>
      {hasKey ? <span className="platform-badge ok"><CheckCircle2 size={13}/>已配置 {source === "self" ? "我的" : "共享"}</span> : <span className="platform-badge">未配置</span>}
    </header>
    {message ? <div className="platform-message" role="status">{message}</div> : null}
    <div className="openai-key-row">
      {hasKey && masked ? <div className="openai-key-current"><span>当前：</span><code>{masked}</code><button className="ghost-button compact" type="button" onClick={() => void remove()} disabled={busy}><Trash2 size={14}/>删除</button></div> : null}
      <label>新 Key<input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="sk-...（只用于网页索引搜索）" autoComplete="off" spellCheck={false}/></label>
      <button className="primary-button" type="button" onClick={() => void save()} disabled={busy || !draft.trim()}>{busy ? <LoaderCircle className="spin" size={16}/> : <Plus size={16}/>}保存 Key</button>
    </div>
    <p className="platform-muted">没填 Key 的用户使用平台免费搜索额度（Tavily）或平台共享 Key；两者都没有时，网页索引平台会显示“不可用”，仍可搜索已连接的 ATS 来源。</p>
  </section>;
}
