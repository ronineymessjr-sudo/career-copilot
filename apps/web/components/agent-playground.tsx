"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Bot, Braces, CheckCircle2, Clipboard, FileCheck2, Gauge, GitBranch, Play, ShieldCheck, Sparkles, Target } from "lucide-react";
import { analyzePortfolioDemo, DEFAULT_PLAYGROUND_JD, DEMO_BATCH_JOBS, DEMO_FILTER_POLICY, DEMO_SCENARIOS, runPortfolioBatchDemo } from "@/lib/portfolio-demo.mjs";

type Row = Record<string, any>;
type AnalysisState = "ready" | "dirty" | "loading" | "error";

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className="playground-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export function AgentPlayground() {
  const [jd, setJd] = useState(DEFAULT_PLAYGROUND_JD);
  const [result, setResult] = useState<Row | null>(() => analyzePortfolioDemo(DEFAULT_PLAYGROUND_JD));
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [inputError, setInputError] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("ready");
  const [analysisError, setAnalysisError] = useState("");
  const analysisToken = useRef(0);
  const trace = useMemo(() => ["Supervisor", "JD Analyst", "Hybrid Ranker", "Resume Agent", "Grounding Evaluator"], []);
  const traceCopy = useMemo(() => [
    "理解目标，编排任务并监控执行",
    "解析 JD 结构、要求与隐含约束",
    "融合规则、证据和历史信号",
    "按证据生成差异化材料",
    "检查引用覆盖与事实一致性",
  ], []);
  const batch = useMemo(() => runPortfolioBatchDemo(DEMO_BATCH_JOBS), []);

  function selectScenario(scenario: (typeof DEMO_SCENARIOS)[number]) {
    analysisToken.current += 1;
    setJd(scenario.jd);
    setResult(null);
    setAnalysisState("dirty");
    setAnalysisError("");
    setInputError("");
    setCopied(false);
    setCopyError("");
  }

  async function analyze() {
    const normalizedJd = jd.trim();
    const token = ++analysisToken.current;
    if (normalizedJd.length < 20) {
      setInputError("请先粘贴一段完整岗位描述（至少 20 个字符），再运行分析。");
      setAnalysisError("输入过短，尚未生成新的分析结果。");
      setAnalysisState("error");
      setResult(null);
      return;
    }
    setInputError("");
    setAnalysisError("");
    setAnalysisState("loading");
    setResult(null);
    setCopied(false);
    setCopyError("");
    try {
      const next = await new Promise<Row>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => reject(new Error("分析超过 8 秒仍未完成，请重试。")), 8000);
        window.setTimeout(() => {
          try {
            resolve(analyzePortfolioDemo(normalizedJd));
          } catch (error) {
            reject(error);
          } finally {
            window.clearTimeout(timeoutId);
          }
        }, 0);
      });
      if (token !== analysisToken.current) return;
      setResult(next);
      setAnalysisState("ready");
    } catch (error) {
      if (token !== analysisToken.current) return;
      setAnalysisError(error instanceof Error ? error.message : "分析失败，请重试。");
      setAnalysisState("error");
    }
  }

  async function copyGreeting() {
    if (!result) return;
    const greeting = String(result.greeting?.greeting ?? "");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(greeting);
      setCopied(true);
      setCopyError("");
    } catch {
      try {
        const fallback = document.createElement("textarea");
        fallback.value = greeting;
        fallback.setAttribute("readonly", "");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        document.body.appendChild(fallback);
        fallback.select();
        const copiedByFallback = document.execCommand("copy");
        fallback.remove();
        if (!copiedByFallback) throw new Error("copy rejected");
        setCopied(true);
        setCopyError("");
      } catch {
        setCopied(false);
        setCopyError("复制未完成，请手动选择上方招呼语文本。");
      }
    }
  }

  return <main className="portfolio-page">
    <header className="portfolio-nav">
      <Link href="/playground" className="portfolio-brand"><span><Sparkles size={16}/></span><div><strong>Career Copilot</strong><small>Evidence-driven AI career workspace</small></div></Link>
      <nav className="portfolio-nav-links" aria-label="公开展示导航"><a href="#proof">产品能力</a><a href="#workflow">工作原理</a><a href="#safety">安全与透明</a></nav>
      <div><Link href="/updates" className="ghost-button">更新日志</Link><Link href="/login" className="ghost-button">登录控制台</Link><a href="#demo" className="primary-button">体验 Demo <ArrowRight size={14}/></a></div>
    </header>

    <section className="portfolio-hero" id="product">
      <div>
        <h1>把求职流程变成一个<br/><em>有证据、可评测、可人工接管</em>的 AI Agent 系统</h1>
        <p>面向 AI Agent、LLM 应用、RAG、AI 产品和解决方案实习。系统完成岗位分析、混合评分、证据检索、简历适配和面试准备，但不会替用户自动投递或发送。</p>
        <ul className="hero-points"><li><CheckCircle2 size={15}/>JD 深度分析：结构化解析职位要求与隐含约束</li><li><CheckCircle2 size={15}/>证据检索：从项目经历中找到最强证据，逐条对齐 JD</li><li><CheckCircle2 size={15}/>简历适配：基于证据生成差异化版本，保留可追溯引用</li><li><CheckCircle2 size={15}/>安全可控：发送、提交、面试与 Offer 动作都需要人工确认</li></ul>
        <div className="portfolio-actions"><a href="#demo" className="primary-button"><Play size={14}/>分析一条真实 JD</a><Link href="/agents" className="ghost-button">查看 Agent 控制台</Link></div>
        <div className="hero-note"><ShieldCheck size={15}/><span>公开演示环境：不连接邮箱、不读取私人资料、不自动投递。</span></div>
      </div>
      <div className="architecture-card" id="workflow">
        <div className="architecture-title"><Bot size={18}/><div><strong>Grounded Agent Runtime</strong><span>每个节点保留输入摘要、结果与引用</span></div></div>
        <div className="architecture-flow">{trace.map((node, index) => <div key={node}><span>{index + 1}</span><div><strong>{node}</strong><small>{traceCopy[index]}</small></div><b>{index === 0 ? "运行中" : "已完成"}</b></div>)}</div>
        <div className="architecture-safety"><ShieldCheck size={16}/><span>Human-in-the-loop：发送、提交、面试与 Offer 动作必须独立确认</span></div>
      </div>
    </section>

    <section className="portfolio-capabilities" id="proof">
      <article><GitBranch size={18}/><strong>Multi-Agent Workflow</strong><p>岗位发现、JD 分析、简历、面试与评测由专用节点协作。</p></article>
      <article><Braces size={18}/><strong>MCP-compatible Tools</strong><p>读操作可调用，高风险写操作只返回审批要求。</p></article>
      <article><Target size={18}/><strong>Hybrid Ranking</strong><p>40% 硬规则、40% 证据匹配、20% 历史反馈。</p></article>
      <article><CheckCircle2 size={18}/><strong>Agent Evaluation</strong><p>Recall@K、MRR、Citation Coverage 与 Grounding 检查。</p></article>
    </section>

    <section className="playground-shell" id="demo">
      <header><div><span className="eyebrow">Public portfolio demo</span><h2>Agent Playground</h2><p>粘贴 AI 实习 JD，立即查看岗位评分、证据匹配、风险、简历版本和招呼语。此演示不读取私人数据。</p></div><span className="demo-badge">SAFE DEMO</span></header>
      <div className="playground-grid">
        <div className="playground-input">
          <div className="playground-scenarios" aria-label="公开演示场景">
            <div><strong>先选一个实操场景</strong><small>每个场景都使用公开示例，不读取私有资料</small></div>
            <div className="playground-scenario-list">{DEMO_SCENARIOS.map((scenario) => <button key={scenario.id} type="button" className={jd === scenario.jd ? "active" : ""} aria-pressed={jd === scenario.jd} onClick={() => selectScenario(scenario)}><span>{scenario.label}</span><small>{scenario.note}</small></button>)}</div>
            <p className="playground-scenario-status" aria-live="polite">{analysisState === "dirty" ? "场景已切换，请点击“运行 Agent 分析”查看结果。" : "默认展示公开示例结果；你可以切换场景后重新分析。"}</p>
          </div>
          <label>岗位 JD<textarea value={jd} aria-describedby={inputError ? "playground-input-error" : undefined} onChange={(event) => { analysisToken.current += 1; setJd(event.target.value); setResult(null); setAnalysisState("dirty"); setAnalysisError(""); setCopyError(""); if (inputError) setInputError(""); }} rows={16}/></label>
          <div className="playground-input-meta"><span>{jd.length} 个字符</span><span>至少 20 个字符后可运行分析</span></div>
          {inputError ? <p id="playground-input-error" className="playground-input-error" role="alert">{inputError}</p> : null}
          <button className="primary-button" onClick={() => void analyze()} disabled={analysisState === "loading"} aria-busy={analysisState === "loading"}><Sparkles size={14}/>{analysisState === "loading" ? "正在分析…" : "运行 Agent 分析"}</button>
          <small>{result?.disclaimer ?? "修改岗位描述后，请运行 Agent 分析；公开 Demo 不读取私人数据。"}</small>
        </div>
        <div className="playground-output">
          {result ? <>
          <div className="playground-score-head">
            <div className={`grade grade-${String(result.score?.grade ?? "c").toLowerCase()}`}>{result.score?.grade}</div>
            <div><span>{result.job?.company_name}</span><h3>{result.job?.title}</h3><p>{[result.job?.workplace, result.job?.city, result.job?.district].filter(Boolean).join(" · ") || "地点待核验"}</p></div>
            <strong>{result.score?.final_score}</strong>
          </div>
          <div className="playground-analysis-context"><strong>公开示例结果已生成</strong><span>{result.job?.title}</span><small>默认结果可直接查看；点击“运行 Agent 分析”可重新计算当前输入。仅使用当前岗位文本与公开示例证据，不代表个人经历。</small></div>
          <div className="playground-demo-disclosure"><strong>公开示例 · 不可直接投递</strong><span>下一步：核验原岗位，再登录控制台使用个人证据生成材料。</span></div>
          <div className={`playground-decision ${result.trace?.decision === "keep" ? "keep" : "review"}`}><strong>{result.trace?.decision === "keep" ? "建议保留供人工复核" : "建议跳过或人工复核"}</strong><span>分数只是排序信号，不代表录用概率；最终动作仍需人工确认。</span></div>
          <div className="playground-metrics">
            <Metric label="规则分" value={result.score?.rule_score ?? 0} note="届别、实习、地点与周期"/>
            <Metric label="证据分" value={result.score?.semantic_score ?? 0} note="示例项目与 JD 重合"/>
            <Metric label="历史分" value={result.score?.history_score ?? 0} note="无样本时使用中性基线"/>
          </div>
          <div className="playground-section"><strong>已匹配</strong><div className="tag-row">{(result.score?.matched_skills ?? []).map((item: string) => <span key={item}>{item}</span>)}</div></div>
          <div className="playground-section"><strong>缺口与风险</strong><ul>{(result.score?.missing_skills ?? []).slice(0, 6).map((item: string) => <li key={item}>{item}</li>)}{(result.trace?.checks ?? []).filter((check: Row) => check.status !== "pass").map((check: Row) => <li key={`check-${check.key}`}>{check.label}：{check.detail}</li>)}{(result.score?.blockers ?? []).map((item: string) => <li key={item}>{item}</li>)}</ul></div>
          <div className="resume-recommendation"><FileCheck2 size={17}/><div><span>推荐简历</span><strong>{result.resume?.persona_label}</strong><p>{(result.resume?.emphasis ?? []).join("；")}</p><small>{(result.resume?.alignment?.explanation ?? []).slice(1, 3).join("；")}</small></div></div>
          <div className="greeting-draft"><div><span>公开示例招呼语</span><small>仅演示文案，不代表你的个人经历</small><p>{result.greeting?.greeting}</p>{copyError ? <small className="playground-copy-error" role="alert">{copyError}</small> : null}</div><button className="ghost-button" onClick={() => void copyGreeting()}><Clipboard size={13}/>{copied ? "已复制" : "复制"}</button></div>
          <div className="playground-safety"><ShieldCheck size={15}/><span>状态：等待人工确认 · 不自动发送 · 不自动投递</span></div>
          </> : <div className="playground-empty-state" role={analysisState === "error" ? "alert" : undefined}>
            <strong>{analysisState === "loading" ? "正在运行 Agent 分析…" : analysisState === "error" ? "这次分析没有完成" : "尚未分析当前输入"}</strong>
            <p>{analysisError || (analysisState === "dirty" ? "岗位描述已修改；点击“运行 Agent 分析”后才会生成新的结果。" : "粘贴至少 20 个字符的岗位描述，再运行分析。")}</p>
            {analysisState === "error" ? <button className="ghost-button" type="button" onClick={() => void analyze()}>重试分析</button> : null}
          </div>}
        </div>
      </div>
    </section>

    <section className="batch-lab">
      <header><div><span className="eyebrow">BATCH FILTER SIMULATION</span><h2>一次看懂“保留、跳过、待复核”。</h2><p>这组公开示例模拟作者工具里的批量筛选逻辑：硬条件、薪资区间、屏蔽词、公司年份、风险信号、重复岗位和投递节奏都会显示原因，但不会执行点击或发送。</p><small className="batch-policy">当前策略：薪资 {DEMO_FILTER_POLICY.salary_min}-{DEMO_FILTER_POLICY.salary_max} 元/天（区间重叠） · 公司成立年份 ≥ {DEMO_FILTER_POLICY.company_founded_from} · 屏蔽词 {DEMO_FILTER_POLICY.blocked_keywords.join("、")}</small></div><span className="demo-badge">PREVIEW ONLY</span></header>
      <div className="batch-summary"><Metric label="保留" value={batch.kept_count} note="通过当前示例规则"/><Metric label="跳过" value={batch.skipped_count} note="条件不符或重复"/><Metric label="重复保护" value={batch.duplicate_count} note="同公司同岗位"/><Metric label="节奏预览" value={`${batch.pacing.min_seconds}-${batch.pacing.max_seconds}s`} note="不会实际等待或点击"/></div>
      <div className="batch-rows">{batch.rows.map((row: Row) => {
        const decision = row.decision === "keep" ? { label: "保留", tone: "keep" } : row.decision === "skip_duplicate" ? { label: "跳过重复", tone: "duplicate" } : { label: "跳过条件", tone: "filtered" };
        return <article className={`batch-row ${decision.tone}`} key={row.id}><div className="batch-row-score"><strong>{row.score?.final_score ?? 0}</strong><span>{row.score?.grade ?? "-"}</span></div><div className="batch-row-copy"><span>{row.company}</span><strong>{row.title}</strong><small>{[row.job?.workplace, row.job?.city, row.job?.salary].filter(Boolean).join(" · ") || "岗位条件待核验"}</small><div className="batch-tags"><em className={decision.tone}>{decision.label}</em>{(row.trace?.checks ?? []).filter((check: Row) => check.status !== "pass").slice(0, 2).map((check: Row) => <em key={check.key}>{check.label}：{check.detail}</em>)}</div></div><details className="batch-row-details"><summary>查看判定链路</summary><div>{(row.trace?.checks ?? []).map((check: Row) => <p key={check.key}><strong>{check.status === "pass" ? "通过" : check.status === "review" ? "复核" : check.status === "warn" ? "风险" : "拦截"}</strong><span>{check.label} · {check.detail}</span></p>)}<p><strong>{row.trace?.dedupe?.status === "skip" ? "跳过" : "去重"}</strong><span>{row.trace?.dedupe?.detail}</span></p><p><strong>历史</strong><span>{row.trace?.history?.detail}</span></p><p><strong>节奏</strong><span>{row.trace?.pacing?.detail}</span></p></div></details></article>;
      })}</div>
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

    <footer className="portfolio-footer"><div><strong>Career Copilot V2</strong><span>Evidence-driven AI internship operating system</span></div><div><Gauge size={14}/><span>Portfolio demo · no autonomous submission</span><Link href="/updates">查看更新日志</Link><Link href="/privacy">隐私边界</Link></div></footer>
  </main>;
}
