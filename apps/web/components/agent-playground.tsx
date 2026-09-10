"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Clipboard, ShieldCheck } from "lucide-react";
import { WorkspaceBrand, WorkspaceDisclosure, WorkspaceHeading, WorkspaceState } from "@/components/workspace-ui";
import { skillLabel, workplaceLabel } from "@/lib/workspace-presentation.mjs";
import { analyzePortfolioDemo, DEFAULT_PLAYGROUND_JD, DEMO_BATCH_JOBS, DEMO_FILTER_POLICY, DEMO_SCENARIOS, runPortfolioBatchDemo } from "@/lib/portfolio-demo.mjs";

type Row = Record<string, any>;
type AnalysisState = "ready" | "dirty" | "loading" | "error";
const RESULT_TABS = ["岗位匹配", "简历与招呼语"] as const;

export function AgentPlayground() {
  const [jd, setJd] = useState(DEFAULT_PLAYGROUND_JD);
  const [result, setResult] = useState<Row | null>(() => analyzePortfolioDemo(DEFAULT_PLAYGROUND_JD));
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [inputError, setInputError] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("ready");
  const [analysisError, setAnalysisError] = useState("");
  const analysisToken = useRef(0);
  const [resultTab, setResultTab] = useState(0);
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const batch = useMemo(() => runPortfolioBatchDemo(DEMO_BATCH_JOBS), []);
  const selectedScenario = DEMO_SCENARIOS.find((scenario) => scenario.jd === jd);

  function changeJd(value: string) {
    analysisToken.current += 1;
    setJd(value);
    setResultTab(0);
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
    setResultTab(0);
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

  const risks = result ? [
    ...(result.score?.missing_skills ?? []).slice(0, 6).map(skillLabel),
    ...(result.trace?.checks ?? []).filter((check: Row) => check.status !== "pass").map((check: Row) => `${check.label}：${check.detail}`),
    ...(result.score?.blockers ?? []),
  ] as string[] : [];

  return <main className="cc-app cc-public">
    <a className="cc-skip" href="#demo">跳到岗位分析</a>
    <header className="cc-public-nav">
      <WorkspaceBrand href="/playground"/>
      <nav aria-label="公开体验导航"><a href="#demo">岗位分析</a><a href="#methods" onClick={() => { const details = document.getElementById("methods") as HTMLDetailsElement | null; if (details) details.open = true; }}>使用说明</a></nav>
      <Link href="/login" className="cc-button cc-button-primary">登录工作台 <ArrowRight size={16}/></Link>
    </header>
    <section className="cc-public-intro">
      <WorkspaceHeading title="把一个岗位，变成明确的下一步。" description="粘贴 JD，快速查看匹配能力、风险缺口和简历方向。"/>
      <p className="cc-note"><ShieldCheck size={16}/><span>公开演示 · 使用示例资料 · 不读取私人信息，不发送或投递</span></p>
    </section>
    <section className="cc-analysis" id="demo" aria-labelledby="analysis-title">
      <header className="cc-analysis-header"><div><h2 id="analysis-title">先跑一个岗位</h2><p>选一个示例，或粘贴自己的岗位描述。</p></div><div className="cc-steps" aria-label="使用步骤"><span>01 分析</span><span>02 核对</span><span>03 准备</span></div></header>
      <div className="cc-analysis-grid">
        <form className="cc-jd-form" onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
          <label>先选一个示例<select value={selectedScenario?.id ?? "custom"} onChange={(event) => { const scenario = DEMO_SCENARIOS.find((item) => item.id === event.target.value); if (scenario) changeJd(scenario.jd); }}><option value="custom" disabled>自定义岗位描述</option>{DEMO_SCENARIOS.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}</select></label>
          <label htmlFor="jd-input">岗位描述<textarea id="jd-input" value={jd} rows={8} aria-invalid={Boolean(inputError)} aria-describedby={inputError ? "jd-input-error" : "jd-input-help"} onChange={(event) => changeJd(event.target.value)}/></label>
          <div className="cc-input-meta" id="jd-input-help"><span>{jd.trim().length} 个字符</span><span>至少 20 个字符</span></div>
          {inputError ? <p id="jd-input-error" className="cc-error" role="alert">{inputError}</p> : null}
          <button className="cc-button cc-button-primary" type="submit" disabled={analysisState === "loading"} aria-busy={analysisState === "loading"}>{analysisState === "loading" ? "正在分析…" : "分析岗位"}<ArrowRight size={16}/></button>
          <p className="cc-note" role="status">{analysisState === "dirty" ? "输入已修改，点击分析查看新结论。" : analysisState === "ready" ? "示例分析已就绪，先看右侧结论。" : analysisState === "loading" ? "正在分析当前岗位描述。" : "请修改输入后重试。"}</p>
        </form>
        <section className="cc-result" aria-labelledby="result-title" aria-busy={analysisState === "loading"}>
          <h2 id="result-title">分析结果</h2>
          {result ? <>
            <div className="cc-result-job"><p>公开示例 · {result.job?.company_name || "公司待核验"}</p><h3>{result.job?.title}</h3><p>{[workplaceLabel(result.job?.workplace), result.job?.city, result.job?.district].filter(Boolean).join(" · ") || "地点待核验"}</p></div>
            <div className="cc-verdict"><div className="cc-score"><div className="cc-score-ring" style={{ "--score": `${Number(result.score?.final_score ?? 0)}%` } as CSSProperties} aria-label={`匹配分 ${Number(result.score?.final_score ?? 0)} / 100`}><strong>{result.score?.final_score}</strong></div><small>匹配分 / 100</small></div><div><strong>{result.trace?.decision === "keep" ? "建议保留，继续核对条件" : "建议跳过或人工复核"}</strong><p>用于排序，不代表录用概率。{risks.length ? `还有 ${new Set(risks).size} 项缺口或风险需要核对。` : "未发现规则缺口，仍需核验原岗位。"}</p></div></div>
            <div className="cc-result-highlights" aria-label="关键结论"><span><strong>{result.score?.matched_skills?.length ?? 0}</strong><small>匹配能力</small></span><span><strong>{new Set(risks).size}</strong><small>待核对项</small></span><span className="cc-result-highlight-persona"><strong>{result.resume?.persona_label || "待定"}</strong><small>简历方向</small></span></div>
            <div className="cc-result-tabs" role="tablist" aria-label="分析结果内容">{RESULT_TABS.map((label, index) => <button key={label} ref={(node) => { tabButtons.current[index] = node; }} type="button" role="tab" id={`result-tab-${index}`} aria-controls={`result-panel-${index}`} aria-selected={resultTab === index} tabIndex={resultTab === index ? 0 : -1} onClick={() => setResultTab(index)} onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? RESULT_TABS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + RESULT_TABS.length) % RESULT_TABS.length;
              setResultTab(next);
              tabButtons.current[next]?.focus();
            }}>{label}</button>)}</div>
            <div role="tabpanel" id="result-panel-0" aria-labelledby="result-tab-0" tabIndex={0} hidden={resultTab !== 0}>
              <section className="cc-result-section"><h4>已匹配的能力</h4><div className="cc-tags">{(result.score?.matched_skills ?? []).map((item: string) => <span key={item}>{skillLabel(item)}</span>)}</div>{!result.score?.matched_skills?.length ? <p className="cc-note">当前示例证据尚未匹配到明确能力。</p> : null}</section>
              <section className="cc-result-section"><h4>需要核对的缺口</h4>{risks.length ? <ul className="cc-risk-list">{[...new Set(risks)].map((risk) => <li key={risk}>{risk}</li>)}</ul> : <p className="cc-note">暂无规则缺口。请核验岗位来源和个人经历后再准备投递。</p>}</section>
              <details className="cc-score-details"><summary>分数怎么算？</summary><dl><dt>规则分 · 届别、地点、周期</dt><dd>{result.score?.rule_score ?? 0}</dd><dt>证据分 · 示例项目与岗位重合</dt><dd>{result.score?.semantic_score ?? 0}</dd><dt>历史分 · 无样本用中性基线</dt><dd>{result.score?.history_score ?? 0}</dd></dl><p>规则 40% · 证据 40% · 历史 20%。仅使用确定性演示逻辑，不调用个人模型或账号。</p></details>
            </div>
            <div className="cc-material" role="tabpanel" id="result-panel-1" aria-labelledby="result-tab-1" tabIndex={0} hidden={resultTab !== 1}>
              <p className="cc-note">推荐简历方向</p><h4>{result.resume?.persona_label}</h4><p>{(result.resume?.emphasis ?? []).join("；")}</p><p className="cc-note">{(result.resume?.alignment?.explanation ?? []).slice(1, 3).join("；")}</p>
              <section className="cc-greeting"><strong>招呼语示例</strong><p>{result.greeting?.greeting}</p><button className="cc-button" type="button" onClick={() => void copyGreeting()}>{copied ? <Check size={16}/> : <Clipboard size={16}/>}{copied ? "已复制" : "复制招呼语"}</button><p className="cc-note">示例内容不代表你的经历，不可直接投递。</p>{copyError ? <p className="cc-error" role="alert">{copyError}</p> : null}</section>
            </div>
            <div className="cc-result-next"><button className="cc-button" type="button" onClick={() => { setResultTab(1); tabButtons.current[1]?.focus(); }}>查看材料方向 <ArrowRight size={16}/></button><Link href="/login" className="cc-link">登录后使用个人资料 <ArrowRight size={16}/></Link><span className="cc-note">核验经历，再生成正式材料。</span></div>
          </> : <WorkspaceState tone={analysisState === "loading" ? "loading" : analysisState === "error" ? "error" : "empty"} title={analysisState === "loading" ? "正在分析当前岗位" : analysisState === "error" ? "这次分析没有完成" : "等待分析新输入"} description={analysisError || "岗位描述已修改。点击“分析岗位”，再查看新的匹配结果。"} action={analysisState === "error" ? <button className="cc-button" type="button" onClick={() => void analyze()}>重试分析</button> : undefined}/>}</section>
      </div>
    </section>
    <div className="cc-public-details">
      <WorkspaceDisclosure title="批量筛选示例" description="查看保留、跳过与重复保护的判断依据。">
        <div className="cc-batch-summary"><span>保留<strong>{batch.kept_count}</strong></span><span>跳过<strong>{batch.skipped_count}</strong></span><span>重复保护<strong>{batch.duplicate_count}</strong></span></div>
        <p className="cc-note">示例策略：{DEMO_FILTER_POLICY.salary_min}–{DEMO_FILTER_POLICY.salary_max} 元/天，公司成立年份 ≥ {DEMO_FILTER_POLICY.company_founded_from}；屏蔽词：{DEMO_FILTER_POLICY.blocked_keywords.join("、")}。仅模拟筛选，不点击招聘平台。</p>
        {batch.rows.map((row: Row) => <article className="cc-batch-row" key={row.id}><div><strong>{row.title}</strong><p>{row.company} · {[row.job?.city, row.job?.salary].filter(Boolean).join(" · ")}</p></div><span>{row.decision === "keep" ? "保留" : row.decision === "skip_duplicate" ? "跳过重复" : "跳过条件"}</span><details><summary>查看判断依据</summary>{(row.trace?.checks ?? []).map((check: Row) => <p key={check.key}>{check.label}：{check.detail}</p>)}<p>去重：{row.trace?.dedupe?.detail}</p><p>历史：{row.trace?.history?.detail}</p><p>节奏：{row.trace?.pacing?.detail}</p></details></article>)}
      </WorkspaceDisclosure>
      <WorkspaceDisclosure id="methods" title="使用方法与评测说明" description="了解演示边界，以及如何开始正式投递准备。">
        <div className="cc-methods"><section><h3>从示例到个人工作台</h3><ol><li>粘贴岗位描述，核对要求和风险。</li><li>登录后补充个人画像、简历与项目证据。</li><li>检查生成材料，再确认实际投递方式。</li></ol><p>公开页只演示岗位匹配与材料方向，不代表已执行多 Agent 任务、生成完整简历或真实投递。</p><Link className="cc-link" href="/login">进入个人工作台 <ArrowRight size={16}/></Link></section><section><h3>技术与评测</h3><p>正式系统包含 JD 分析、混合排序、简历准备、引用核验与 MCP 工具；写操作受审批控制。</p><p>仓库内的受控评测覆盖 Recall@K、MRR、引用覆盖和不受支持声明。测试基线不是生产用户成功率。</p><a className="cc-link" href="https://github.com/ronineymessjr-sudo/career-copilot/blob/main/docs/agent-evaluation-report.md" target="_blank" rel="noreferrer">查看评测文档 <ArrowRight size={16}/></a></section></div>
      </WorkspaceDisclosure>
    </div>
    <footer className="cc-public-footer"><span>Career Copilot · 让每一步求职都有依据。</span><Link href="/updates">更新日志</Link><Link href="/privacy">隐私与数据边界</Link></footer>
  </main>;
}
