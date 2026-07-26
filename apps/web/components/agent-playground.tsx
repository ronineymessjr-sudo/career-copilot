"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Bot, Braces, CheckCircle2, Clipboard, FileCheck2, Gauge, GitBranch, Play, ShieldCheck, Sparkles, Target } from "lucide-react";
import { analyzePortfolioDemo, DEFAULT_PLAYGROUND_JD } from "@/lib/portfolio-demo.mjs";

type Row = Record<string, any>;

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className="playground-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export function AgentPlayground() {
  const [jd, setJd] = useState(DEFAULT_PLAYGROUND_JD);
  const [result, setResult] = useState<Row>(() => analyzePortfolioDemo(DEFAULT_PLAYGROUND_JD));
  const [copied, setCopied] = useState(false);
  const trace = useMemo(() => ["Supervisor", "JD Analyst", "Hybrid Ranker", "Resume Agent", "Grounding Evaluator"], []);

  function analyze() {
    setResult(analyzePortfolioDemo(jd));
    setCopied(false);
  }

  async function copyGreeting() {
    await navigator.clipboard.writeText(String(result.greeting?.greeting ?? ""));
    setCopied(true);
  }

  return <main className="portfolio-page">
    <header className="portfolio-nav">
      <Link href="/playground" className="portfolio-brand"><span><Sparkles size={16}/></span><div><strong>Career Copilot</strong><small>AI Career Intelligence Agent Platform</small></div></Link>
      <div><Link href="/login" className="ghost-button">登录控制台</Link><a href="#demo" className="primary-button">体验 Demo <ArrowRight size={14}/></a></div>
    </header>

    <section className="portfolio-hero">
      <div>
        <span className="eyebrow">LangGraph · RAG · pgvector · MCP · Agent Evaluation</span>
        <h1>把求职流程变成一个<br/><em>有证据、可评测、可人工接管</em>的 AI Agent 系统</h1>
        <p>面向 AI Agent、LLM 应用、RAG、AI 产品和解决方案实习。系统完成岗位分析、混合评分、证据检索、简历适配和面试准备，但不会替用户自动投递或发送。</p>
        <div className="portfolio-actions"><a href="#demo" className="primary-button"><Play size={14}/>分析一条真实 JD</a><Link href="/agents" className="ghost-button">查看 Agent 控制台</Link></div>
      </div>
      <div className="architecture-card">
        <div className="architecture-title"><Bot size={18}/><div><strong>Grounded Agent Runtime</strong><span>每个节点保留输入摘要、结果与引用</span></div></div>
        <div className="architecture-flow">{trace.map((node, index) => <div key={node}><span>{index + 1}</span><strong>{node}</strong>{index < trace.length - 1 ? <ArrowRight size={13}/> : null}</div>)}</div>
        <div className="architecture-safety"><ShieldCheck size={16}/><span>Human-in-the-loop：发送、提交、面试与 Offer 动作必须独立确认</span></div>
      </div>
    </section>

    <section className="portfolio-capabilities">
      <article><GitBranch size={18}/><strong>Multi-Agent Workflow</strong><p>岗位发现、JD 分析、简历、面试与评测由专用节点协作。</p></article>
      <article><Braces size={18}/><strong>MCP-compatible Tools</strong><p>读操作可调用，高风险写操作只返回审批要求。</p></article>
      <article><Target size={18}/><strong>Hybrid Ranking</strong><p>40% 硬规则、40% 证据匹配、20% 历史反馈。</p></article>
      <article><CheckCircle2 size={18}/><strong>Agent Evaluation</strong><p>Recall@K、MRR、Citation Coverage 与 Grounding 检查。</p></article>
    </section>

    <section className="playground-shell" id="demo">
      <header><div><span className="eyebrow">Public portfolio demo</span><h2>Agent Playground</h2><p>粘贴 AI 实习 JD，立即查看岗位评分、证据匹配、风险、简历版本和招呼语。此演示不读取私人数据。</p></div><span className="demo-badge">SAFE DEMO</span></header>
      <div className="playground-grid">
        <div className="playground-input">
          <label>岗位 JD<textarea value={jd} onChange={(event) => setJd(event.target.value)} rows={16}/></label>
          <button className="primary-button" onClick={analyze}><Sparkles size={14}/>运行 Agent 分析</button>
          <small>{result.disclaimer}</small>
        </div>
        <div className="playground-output">
          <div className="playground-score-head">
            <div className={`grade grade-${String(result.score?.grade ?? "c").toLowerCase()}`}>{result.score?.grade}</div>
            <div><span>{result.job?.company_name}</span><h3>{result.job?.title}</h3><p>{[result.job?.workplace, result.job?.city, result.job?.district].filter(Boolean).join(" · ") || "地点待核验"}</p></div>
            <strong>{result.score?.final_score}</strong>
          </div>
          <div className="playground-metrics">
            <Metric label="规则分" value={result.score?.rule_score ?? 0} note="届别、实习、地点与周期"/>
            <Metric label="证据分" value={result.score?.semantic_score ?? 0} note="示例项目与 JD 重合"/>
            <Metric label="历史分" value={result.score?.history_score ?? 0} note="无样本时使用中性基线"/>
          </div>
          <div className="playground-section"><strong>已匹配</strong><div className="tag-row">{(result.score?.matched_skills ?? []).map((item: string) => <span key={item}>{item}</span>)}</div></div>
          <div className="playground-section"><strong>缺口与风险</strong><ul>{(result.score?.missing_skills ?? []).slice(0, 6).map((item: string) => <li key={item}>{item}</li>)}{(result.score?.blockers ?? []).map((item: string) => <li key={item}>{item}</li>)}</ul></div>
          <div className="resume-recommendation"><FileCheck2 size={17}/><div><span>推荐简历</span><strong>{result.resume?.persona_label}</strong><p>{(result.resume?.emphasis ?? []).join("；")}</p></div></div>
          <div className="greeting-draft"><div><span>个性化招呼语</span><p>{result.greeting?.greeting}</p></div><button className="ghost-button" onClick={() => void copyGreeting()}><Clipboard size={13}/>{copied ? "已复制" : "复制"}</button></div>
          <div className="playground-safety"><ShieldCheck size={15}/><span>状态：等待人工确认 · 不自动发送 · 不自动投递</span></div>
        </div>
      </div>
    </section>

    <section className="evaluation-preview">
      <div><span className="eyebrow">Evaluation fixture</span><h2>评测不是装饰，而是发布门禁</h2><p>小型确定性数据集验证检索命中、引用覆盖和不受支持声明。详细结果见仓库中的 <code>docs/agent-evaluation-report.md</code>。</p></div>
      <div className="evaluation-cards">
        <Metric label="Recall@5" value="1.000" note="受控 fixture"/>
        <Metric label="MRR" value="1.000" note="首位命中"/>
        <Metric label="Citation Coverage" value="1.000" note="预期证据全覆盖"/>
        <Metric label="Unsupported Claims" value="0" note="Grounding 门禁"/>
      </div>
    </section>

    <footer className="portfolio-footer"><div><strong>Career Copilot V2</strong><span>Evidence-driven AI internship operating system</span></div><div><Gauge size={14}/><span>Portfolio demo · no autonomous submission</span></div></footer>
  </main>;
}
