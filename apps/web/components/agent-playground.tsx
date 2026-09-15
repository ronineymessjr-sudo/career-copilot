"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Clipboard, ShieldCheck } from "lucide-react";
import { WorkspaceBrand, WorkspaceDisclosure, WorkspaceHeading, WorkspaceState } from "@/components/workspace-ui";
import { LanguageToggle, useLocale } from "@/components/locale-provider";
import { interpolate } from "@/lib/i18n";
import { skillLabel, workplaceLabel } from "@/lib/workspace-presentation.mjs";
import { analyzePortfolioDemo, DEFAULT_PLAYGROUND_JD, DEFAULT_PLAYGROUND_JD_EN, DEMO_BATCH_JOBS, DEMO_FILTER_POLICY, DEMO_SCENARIOS, DEMO_SCENARIOS_EN, runPortfolioBatchDemo } from "@/lib/portfolio-demo.mjs";

type Row = Record<string, any>;
type AnalysisState = "ready" | "dirty" | "loading" | "error";
export function AgentPlayground() {
  const { locale, t } = useLocale();
  const scenarios = locale === "en" ? DEMO_SCENARIOS_EN : DEMO_SCENARIOS;
  const defaultJd = locale === "en" ? DEFAULT_PLAYGROUND_JD_EN : DEFAULT_PLAYGROUND_JD;
  const resultTabs = [t("resultTabsMatch"), t("resultTabsMaterial")];
  const [jd, setJd] = useState(defaultJd);
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
  const selectedScenario = scenarios.find((scenario) => scenario.jd === jd);

  useEffect(() => {
    setJd(defaultJd);
    setResult(analyzePortfolioDemo(defaultJd));
    setResultTab(0);
    setAnalysisState("ready");
    setAnalysisError("");
    setInputError("");
  }, [defaultJd]);

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
      setInputError(locale === "en" ? "Paste a complete job description (at least 20 characters) before running analysis." : "请先粘贴一段完整岗位描述（至少 20 个字符），再运行分析。");
      setAnalysisError(locale === "en" ? "The input is too short; no new result was generated." : "输入过短，尚未生成新的分析结果。");
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
        const timeoutId = window.setTimeout(() => reject(new Error(locale === "en" ? "Analysis did not finish within 8 seconds. Try again." : "分析超过 8 秒仍未完成，请重试。")), 8000);
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
      setAnalysisError(error instanceof Error ? error.message : locale === "en" ? "Analysis failed. Try again." : "分析失败，请重试。");
      setAnalysisState("error");
    }
  }

  async function copyGreeting() {
    if (!result) return;
    const greeting = locale === "en"
      ? "Hello, I’m interested in “" + result.job?.title + "”. I have hands-on experience with " + ((result.score?.matched_skills ?? []).slice(0, 4).map(skillLabel).join(", ") || "relevant projects") + " and would love to learn more about the role, expectations, and hiring process."
      : String(result.greeting?.greeting ?? "");
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
        setCopyError(t("copyFailed"));
      }
    }
  }

  const risks = result ? [
    ...(result.score?.missing_skills ?? []).slice(0, 6).map(skillLabel),
    ...(result.trace?.checks ?? []).filter((check: Row) => check.status !== "pass").map((check: Row) => `${check.label}：${check.detail}`),
    ...(result.score?.blockers ?? []),
  ] as string[] : [];
  const localizedDemoText = (value: string) => {
    if (locale !== "en") return value;
    const replacements: Array<[string, string]> = [
      ["提示词", "Prompt design"],
      ["工具调用", "Tool calling"],
      ["薪资策略：薪资待核验", "Compensation: verify compensation"],
      ["公司年份：成立年份待核验", "Company age: verify founding year"],
      ["岗位新鲜度：来源未提供发布时间，无法断言新旧", "Freshness: posting date unavailable"],
      ["来源未提供发布时间，无法断言新旧", "Posting date unavailable"],
      ["岗位不是实习岗位", "Not an internship"],
      ["岗位明确不接受在校生", "Students are not accepted"],
      ["岗位明确不接受 2028 届", "2028 graduates are not accepted"],
      ["覆盖岗位关键词：", "Covers role keywords: "],
      ["仍缺少：", "Still missing: "],
    ];
    return replacements.reduce((text, [from, to]) => text.replaceAll(from, to), value);
  };
  const displayRisks = risks.map(localizedDemoText);
  const skillLabelsEn: Record<string, string> = {
    "需求文档": "Product requirements",
    "提示词": "Prompt design",
    "工具调用": "Tool calling",
    "智能体开发": "Agent development",
    "评测": "Evaluation",
    "数据分析": "Data analytics",
    "产品": "Product",
    "运营": "Operations",
    "沟通协作": "Communication",
    "设计": "Design",
  };
  const displaySkill = (value: string) => {
    const label = skillLabel(value);
    return locale === "en" ? skillLabelsEn[label] ?? label : label;
  };
  const personaLabels: Record<string, string> = {
    "工程研发版": "Engineering & delivery",
    "产品与运营版": "Product & operations",
    "运营与增长版": "Operations & growth",
    "AI 研究与算法版": "AI research & algorithms",
    "解决方案与商务版": "Solutions & business",
    "本地过渡版": "Local transition",
    "摄影摄像版": "Photo & video",
    "传统研发版": "Traditional R&D",
  };
  const emphasisLabels: Record<string, string> = {
    "工程实现与问题解决": "Engineering execution and problem solving",
    "可验证的项目成果": "Verifiable project outcomes",
    "测试、协作与交付能力": "Testing, collaboration, and delivery",
    "需求分析与用户理解": "Requirement analysis and user understanding",
    "产品方案和运营执行": "Product planning and operations execution",
    "指标、协作与复盘": "Metrics, collaboration, and iteration reviews",
    "算法与实验设计": "Algorithms and experiment design",
    "可复现的评测与结果": "Reproducible evaluation and results",
    "论文复现、数据和工程实现": "Paper reproduction, data, and engineering",
  };
  const displayPersona = result?.resume?.persona_label ? (locale === "en" ? personaLabels[result.resume.persona_label] ?? result.resume.persona_label : result.resume.persona_label) : null;
  const displayEmphasis = (result?.resume?.emphasis ?? []).map((item: string) => locale === "en" ? emphasisLabels[item] ?? item : item);
  const displayedGreeting = result ? locale === "en"
      ? "Hello, I’m interested in “" + result.job?.title + "”. I have hands-on experience with " + ((result.score?.matched_skills ?? []).slice(0, 4).map(displaySkill).join(", ") || "relevant projects") + " and would love to learn more about the role, expectations, and hiring process."
    : result.greeting?.greeting
    : "";
  const formatWorkplace = (value: string | undefined) => locale === "en"
    ? ({ remote: "Remote", hybrid: "Hybrid", onsite: "On-site", unknown: "To verify" } as Record<string, string>)[value ?? "unknown"] ?? value
    : workplaceLabel(value);

  return <main className="cc-app cc-public">
    <a className="cc-skip" href="#demo">{t("publicNavAnalysis")}</a>
    <header className="cc-public-nav">
      <WorkspaceBrand href="/playground"/>
      <nav aria-label={t("publicExperience")}><a href="#demo">{t("publicNavAnalysis")}</a><a href="#methods" onClick={() => { const details = document.getElementById("methods") as HTMLDetailsElement | null; if (details) details.open = true; }}>{t("publicNavMethods")}</a></nav>
      <div className="cc-public-availability"><span aria-hidden="true"/>{t("publicReady")}</div>
      <span className="cc-public-actions"><LanguageToggle/><Link href="/login?next=%2Fdashboard" className="cc-button cc-button-primary">{t("signInWorkspace")} <ArrowRight size={16}/></Link></span>
    </header>
    <section className="cc-public-intro">
      <WorkspaceHeading title={t("publicHeadline")} description={t("publicIntro")}/>
      <p className="cc-note" aria-label="Career Copilot · SAFE PREVIEW"><ShieldCheck size={16}/><span>{t("publicSafe")}</span></p>
    </section>
    <section className="cc-analysis" id="demo" aria-labelledby="analysis-title">
      <header className="cc-analysis-header"><div><h2 id="analysis-title">{t("analysis")}</h2><p>{t("analysisIntro")}</p></div><span className="cc-demo-state">{t("noLogin")}</span></header>
      <div className="cc-analysis-grid">
        <form className="cc-jd-form" onSubmit={(event) => { event.preventDefault(); void analyze(); }}>
          <label>{t("chooseExample")}<select value={selectedScenario?.id ?? "custom"} onChange={(event) => { const scenario = scenarios.find((item) => item.id === event.target.value); if (scenario) changeJd(scenario.jd); }}><option value="custom" disabled>{t("customJob")}</option>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.label}</option>)}</select></label>
          <label htmlFor="jd-input">{t("jobDescription")}<textarea id="jd-input" value={jd} rows={8} aria-invalid={Boolean(inputError)} aria-describedby={inputError ? "jd-input-error" : "jd-input-help"} onChange={(event) => changeJd(event.target.value)}/></label>
          <div className="cc-input-meta" id="jd-input-help"><span>{jd.trim().length} {t("characters")}</span><span>{t("minCharacters")}</span></div>
          {inputError ? <p id="jd-input-error" className="cc-error" role="alert">{inputError}</p> : null}
          <button className="cc-button cc-button-primary" type="submit" disabled={analysisState === "loading"} aria-busy={analysisState === "loading"}>{analysisState === "loading" ? t("analyzing") : t("analyze")}<ArrowRight size={16}/></button>
          <p className="cc-note" role="status">{analysisState === "dirty" ? t("dirtyState") : analysisState === "ready" ? t("readyState") : analysisState === "loading" ? t("loadingState") : t("errorState")}</p>
        </form>
        <section className="cc-result" aria-labelledby="result-title" aria-busy={analysisState === "loading"}>
          <h2 id="result-title">{t("result")}</h2>
          {result ? <>
            <div className="cc-result-job"><p>{t("publicExperience")} · {result.job?.company_name || t("companyToVerify")}</p><h3>{result.job?.title}</h3><p>{[formatWorkplace(result.job?.workplace), result.job?.city, result.job?.district].filter(Boolean).join(" · ") || t("locationToVerify")}</p></div>
            <div className="cc-verdict"><div className="cc-score"><div className="cc-score-ring" style={{ "--score": `${Number(result.score?.final_score ?? 0)}%` } as CSSProperties} aria-label={`${t("matchScore")} ${Number(result.score?.final_score ?? 0)} / 100`}><strong>{result.score?.final_score}</strong></div><small>{t("matchScore")}</small></div><div><strong>{result.trace?.decision === "keep" ? t("keepDecision") : t("skipDecision")}</strong><p>{t("scoreDisclaimer")} {displayRisks.length ? interpolate(t("riskCount"), { count: new Set(displayRisks).size }) : t("noRisks")}</p></div></div>
            <div className="cc-result-highlights" aria-label={t("result")}><span><strong>{result.score?.matched_skills?.length ?? 0}</strong><small>{t("matchedSkills")}</small></span><span><strong>{new Set(displayRisks).size}</strong><small>{t("reviewItems")}</small></span><span className="cc-result-highlight-persona"><strong>{displayPersona || (locale === "en" ? "To decide" : "待定")}</strong><small>{t("resumeDirection")}</small></span></div>
            <div className="cc-result-tabs" role="tablist" aria-label={t("result")}>{resultTabs.map((label, index) => <button key={label} ref={(node) => { tabButtons.current[index] = node; }} type="button" role="tab" id={`result-tab-${index}`} aria-controls={`result-panel-${index}`} aria-selected={resultTab === index} tabIndex={resultTab === index ? 0 : -1} onClick={() => setResultTab(index)} onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? resultTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + resultTabs.length) % resultTabs.length;
              setResultTab(next);
              tabButtons.current[next]?.focus();
            }}>{label}</button>)}</div>
            <div role="tabpanel" id="result-panel-0" aria-labelledby="result-tab-0" tabIndex={0} hidden={resultTab !== 0}>
              <section className="cc-result-section"><h4>{t("matchedCapabilities")}</h4><div className="cc-tags">{(result.score?.matched_skills ?? []).map((item: string) => <span key={item}>{displaySkill(item)}</span>)}</div>{!result.score?.matched_skills?.length ? <p className="cc-note">{t("noMatchedCapabilities")}</p> : null}</section>
              <section className="cc-result-section"><h4>{t("gaps")}</h4>{displayRisks.length ? <ul className="cc-risk-list">{[...new Set(displayRisks)].map((risk) => <li key={risk}>{risk}</li>)}</ul> : <p className="cc-note">{t("noGaps")}</p>}</section>
              <details className="cc-score-details"><summary>{t("scoreHow")}</summary><dl><dt>{t("ruleScore")}</dt><dd>{result.score?.rule_score ?? 0}</dd><dt>{t("evidenceScore")}</dt><dd>{result.score?.semantic_score ?? 0}</dd><dt>{t("historyScore")}</dt><dd>{result.score?.history_score ?? 0}</dd></dl><p>{t("scoreFormula")}</p></details>
            </div>
            <div className="cc-material" role="tabpanel" id="result-panel-1" aria-labelledby="result-tab-1" tabIndex={0} hidden={resultTab !== 1}>
              <p className="cc-note">{t("recommendedDirection")}</p><h4>{displayPersona}</h4><p>{displayEmphasis.join(locale === "en" ? "; " : "；")}</p><p className="cc-note">{(result.resume?.alignment?.explanation ?? []).slice(1, 3).map(localizedDemoText).join(locale === "en" ? "; " : "；")}</p>
              <section className="cc-greeting"><strong>{t("greetingExample")}</strong><p>{displayedGreeting}</p><button className="cc-button" type="button" onClick={() => void copyGreeting()}>{copied ? <Check size={16}/> : <Clipboard size={16}/>}{copied ? t("copied") : t("copyGreeting")}</button><p className="cc-note">{t("demoNotPersonal")}</p>{copyError ? <p className="cc-error" role="alert">{copyError}</p> : null}</section>
            </div>
            <div className="cc-result-next"><button className="cc-button" type="button" onClick={() => { setResultTab(1); tabButtons.current[1]?.focus(); }}>{t("viewMaterial")} <ArrowRight size={16}/></button><Link href="/login?next=%2Fdashboard" className="cc-link">{t("loginForProfile")} <ArrowRight size={16}/></Link><span className="cc-note">{t("verifyBeforeResume")}</span></div>
          </> : <WorkspaceState tone={analysisState === "loading" ? "loading" : analysisState === "error" ? "error" : "empty"} title={analysisState === "loading" ? t("analysis") : analysisState === "error" ? (locale === "en" ? "This analysis did not finish" : "这次分析没有完成") : (locale === "en" ? "Waiting for a new analysis" : "等待分析新输入")} description={analysisError || (locale === "en" ? "The job description changed. Run analysis to see a new result." : "岗位描述已修改。点击“分析岗位”，再查看新的匹配结果。")} action={analysisState === "error" ? <button className="cc-button" type="button" onClick={() => void analyze()}>{locale === "en" ? "Retry" : "重试分析"}</button> : undefined}/>}</section>
      </div>
    </section>
    <div className="cc-public-details">
      <WorkspaceDisclosure title={t("batchTitle")} description={t("batchDescription")}>
        <div className="cc-batch-summary"><span>{t("kept")}<strong>{batch.kept_count}</strong></span><span>{t("skipped")}<strong>{batch.skipped_count}</strong></span><span>{t("duplicateProtection")}<strong>{batch.duplicate_count}</strong></span></div>
        <p className="cc-note">{interpolate(t("samplePolicy"), { min: DEMO_FILTER_POLICY.salary_min, max: DEMO_FILTER_POLICY.salary_max, year: DEMO_FILTER_POLICY.company_founded_from, keywords: DEMO_FILTER_POLICY.blocked_keywords.join(locale === "en" ? ", " : "、") })}</p>
        {batch.rows.map((row: Row) => <article className="cc-batch-row" key={row.id}><div><strong>{row.title}</strong><p>{row.company} · {[row.job?.city, row.job?.salary].filter(Boolean).join(" · ")}</p></div><span>{row.decision === "keep" ? t("kept") : row.decision === "skip_duplicate" ? t("skipDuplicate") : t("skipCondition")}</span><details><summary>{t("viewReason")}</summary>{(row.trace?.checks ?? []).map((check: Row) => <p key={check.key}>{check.label}：{check.detail}</p>)}<p>{t("dedupe")}：{row.trace?.dedupe?.detail}</p><p>{t("history")}：{row.trace?.history?.detail}</p><p>{t("pacing")}：{row.trace?.pacing?.detail}</p></details></article>)}
      </WorkspaceDisclosure>
      <WorkspaceDisclosure id="methods" title={t("methodsTitle")} description={t("methodsDescription")}>
        <div className="cc-methods"><section><h3>{t("fromDemo")}</h3><ol><li>{t("method1")}</li><li>{t("method2")}</li><li>{t("method3")}</li></ol><p>{t("demoBoundary")}</p><Link className="cc-link" href="/login?next=%2Fdashboard">{t("enterWorkspace")} <ArrowRight size={16}/></Link></section><section><h3>{t("techEvaluation")}</h3><p>{t("techDescription")}</p><p>{t("evalDescription")}</p><a className="cc-link" href="https://github.com/ronineymessjr-sudo/career-copilot/blob/main/docs/agent-evaluation-report.md" target="_blank" rel="noreferrer">{t("evalDoc")} <ArrowRight size={16}/></a></section></div>
      </WorkspaceDisclosure>
    </div>
    <footer className="cc-public-footer"><span>Career Copilot · {t("publicFooter")}</span><Link href="/updates">{t("updates")}</Link><Link href="/privacy">{t("privacy")}</Link></footer>
  </main>;
}
