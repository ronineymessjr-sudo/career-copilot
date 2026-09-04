"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileSearch, Gauge, Link2, LoaderCircle, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Analysis = {
  role: string;
  company: string;
  location: string;
  verdict: string;
  must_have: string[];
  nice_to_have: string[];
  duties: string[];
  hidden_signals: string[];
  matched: string[];
  gaps: string[];
  fit_note: string;
  interview_hints: string[];
  actions: string[];
};
type AssessResult = { checks: Array<{ name: string; pass: boolean; why: string }>; passed: number; total: number; ready: boolean };

export function JdToolWorkspace() {
  const [jdText, setJdText] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [assess, setAssess] = useState<AssessResult | null>(null);
  const [busy, setBusy] = useState<"jd" | "assess" | "">("");
  const [message, setMessage] = useState("");

  const runJd = useCallback(async () => {
    if (!jdText.trim() && !jdUrl.trim()) { setMessage("请粘贴 JD 文本或输入岗位 URL。"); return; }
    setBusy("jd");
    setMessage(jdUrl.trim() && !jdText.trim() ? "正在抓取岗位页面…" : "");
    try {
      const result = await controlFetch<{ analysis: Analysis }>("/api/control/jd", {
        method: "POST",
        body: JSON.stringify({ text: jdText, url: jdUrl }),
      });
      setAnalysis(result.analysis);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JD 拆解失败");
    } finally {
      setBusy("");
    }
  }, [jdText, jdUrl]);

  const runAssess = useCallback(async () => {
    setBusy("assess");
    try {
      const result = await controlFetch<AssessResult>("/api/control/assess");
      setAssess(result);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "就绪度检查失败");
    } finally {
      setBusy("");
    }
  }, []);

  useEffect(() => { void runAssess(); }, [runAssess]);

  return <section className="platform-workspace">
    <header className="platform-page-head"><div><h1>JD 深拆与简历就绪度</h1><p>先判断该不该投，再看缺口和简历是否就绪。</p></div></header>
    {message ? <div className="platform-message" role="status">{message}</div> : null}

    <nav className="platform-priority-rail" aria-label="JD 分析优先级">
      <article className="platform-priority-item p0"><span>P0 · 现在看</span><strong>{analysis?.verdict ?? "先粘贴 JD"}</strong><small>{analysis ? "确认是否值得继续" : "输入岗位文本或 URL"}</small></article>
      <article className="platform-priority-item p1"><span>P1 · 接着处理</span><strong>{analysis ? `${analysis.gaps?.length ?? 0} 个待补缺口` : "匹配与缺口"}</strong><small>把缺口转成简历行动</small></article>
      <article className="platform-priority-item p2"><span>P2 · 需要时看</span><strong>{assess ? `${assess.passed}/${assess.total} 项就绪` : "简历门禁"}</strong><small>全部通过后再生成最终版</small></article>
    </nav>

    <section className="platform-panel">
      <header className="platform-panel-head"><div><h2><FileSearch size={17}/>岗位 JD 深拆</h2><p>输入 JD 文本或岗位 URL,分析该不该投、缺什么、怎么补。</p></div><button className="primary-button" type="button" onClick={() => void runJd()} disabled={busy === "jd" || (!jdText.trim() && !jdUrl.trim())}><Sparkles size={15}/>{busy === "jd" ? "拆解中…" : "开始拆解"}</button></header>
      <div className="platform-form-grid two">
        <label className="full">岗位 URL(可选,自动抓取)<input value={jdUrl} onChange={(event) => setJdUrl(event.target.value)} placeholder="https://…(通过 r.jina.ai 免费抓取)"/></label>
        <label className="full">JD 文本<textarea rows={8} value={jdText} onChange={(event) => setJdText(event.target.value)} placeholder="粘贴岗位 JD:职责、要求、加分项…"/></label>
      </div>
    </section>

    {analysis ? <section className="platform-panel jd-result">
      <header className="platform-panel-head"><div><h2>拆解结果 · {analysis.role || "未识别岗位"}</h2><p>{analysis.company || "公司未知"} · {analysis.location || "地点未说明"}</p></div><span className={`jd-verdict ${analysis.matched?.length ? "ok" : "warn"}`}>{analysis.verdict}</span></header>
      <details className="platform-secondary-fold jd-breakdown-fold"><summary>查看岗位拆解明细 · {analysis.must_have.length + analysis.nice_to_have.length + analysis.duties.length + analysis.hidden_signals.length} 项</summary><div className="jd-breakdown-grid">
        {analysis.must_have.length ? <div className="jd-block"><strong>必备条件(硬门槛)</strong><ul>{analysis.must_have.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
        {analysis.nice_to_have.length ? <div className="jd-block"><strong>加分项(软性)</strong><ul>{analysis.nice_to_have.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
        {analysis.duties.length ? <div className="jd-block"><strong>日常工作与职责</strong><ul>{analysis.duties.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
        {analysis.hidden_signals.length ? <div className="jd-block"><strong>隐含信息</strong><ul>{analysis.hidden_signals.map((x, i) => <li key={i}>{x}</li>)}</ul></div> : null}
      </div></details>
      <div className="jd-block"><strong>你的匹配度</strong>
        {analysis.matched?.length ? <p>✅ 命中:{analysis.matched.join("、")}</p> : null}
        {analysis.gaps?.length ? <p>⚠️ 缺口:{analysis.gaps.join("、")}</p> : null}
        <p>{analysis.fit_note}</p>
      </div>
      {analysis.interview_hints?.length ? <details className="platform-secondary-fold jd-interview-fold"><summary>面试重点 · {analysis.interview_hints.length} 项</summary><div className="jd-block"><ul>{analysis.interview_hints.map((x, i) => <li key={i}>{x}</li>)}</ul></div></details> : null}
      {analysis.actions?.length ? <div className="jd-block"><strong>行动清单</strong><ul>{analysis.actions.map((x, i) => <li key={i}>☐ {x}</li>)}</ul></div> : null}
    </section> : null}

    <section className="platform-panel">
      <header className="platform-panel-head"><div><h2><Gauge size={17}/>简历生成就绪度(7 项门禁)</h2><p>借鉴资深方法论:目标/信息/证据闭环/技能关联/无疑点/确认 全部通过才能生成最终简历。</p></div><button className="ghost-button" type="button" onClick={() => void runAssess()} disabled={busy === "assess"}><RefreshCw size={14}/>{busy === "assess" ? "检查中…" : "重新检查"}</button></header>
      {assess ? <>
        <div className={`assess-banner ${assess.ready ? "ok" : "warn"}`}>{assess.ready ? <CheckCircle2 size={18}/> : <XCircle size={18}/>}<strong>通过 {assess.passed}/{assess.total} 项 · {assess.ready ? "READY,可以生成最终简历" : "NOT READY,先补齐未通过项"}</strong></div>
        <div className="assess-list">{assess.checks.map((c) => <div key={c.name} className={c.pass ? "pass" : "fail"}><span>{c.pass ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}</span><strong>{c.name}</strong>{c.why ? <small>{c.why}</small> : null}</div>)}</div>
      </> : <p className="platform-muted">正在加载就绪度…</p>}
    </section>
  </section>;
}
