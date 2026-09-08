"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, CircleAlert, ClipboardCheck, Clock3, DatabaseZap, FileText, ListChecks, ListFilter, Send, Sparkles, Target, UserRound } from "lucide-react";
import { WorkspaceHeading, WorkspaceState } from "@/components/workspace-ui";
import { controlFetch } from "@/lib/control-client";
import { buildOnboardingChecklist, groupDailyRecommendations } from "@/lib/recommendation-experience.mjs";

type Row = Record<string, any>;
type OverviewState = {
  jobs: Row[];
  pool: Row;
  sources: Row[];
  runs: Row[];
  applications: Row[];
  profile: Row | null;
  completeness: Row;
  analytics: Row | null;
  daily: Row | null;
  resumes: Row[];
  notifications: Row[];
  unread: number;
};

function jobScore(job: Row) {
  const value = Number(job.recommendation?.score ?? job.evaluation?.total_score);
  return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
}

export function OverviewWorkspace() {
  const [state, setState] = useState<OverviewState>({ jobs: [], pool: {}, sources: [], runs: [], applications: [], profile: null, completeness: {}, analytics: null, daily: null, resumes: [], notifications: [], unread: 0 });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jobs, sources, applications, profile, analytics, automation, resumes, notifications] = await Promise.all([
        controlFetch<{ jobs: Row[]; pool: Row }>("/api/control/jobs"),
        controlFetch<{ sources: Row[]; runs: Row[] }>("/api/control/sources").catch(() => ({ sources: [], runs: [] })),
        controlFetch<{ applications: Row[] }>("/api/control/applications").catch(() => ({ applications: [] })),
        controlFetch<{ profile: Row; completeness: Row }>("/api/control/profile"),
        controlFetch<Row>("/api/control/analytics?days=30").catch(() => null),
        controlFetch<{ latest: Row | null }>("/api/control/automation").catch(() => ({ latest: null })),
        controlFetch<{ resumes: Row[] }>("/api/control/resumes").catch(() => ({ resumes: [] })),
        controlFetch<{ notifications: Row[]; unread: number }>("/api/control/notifications").catch(() => ({ notifications: [], unread: 0 })),
      ]);
      setState({ jobs: jobs.jobs ?? [], pool: jobs.pool ?? {}, sources: sources.sources ?? [], runs: sources.runs ?? [], applications: applications.applications ?? [], profile: profile.profile, completeness: profile.completeness ?? {}, analytics, daily: automation.latest ?? null, resumes: resumes.resumes ?? [], notifications: notifications.notifications ?? [], unread: notifications.unread ?? 0 });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "今日简报加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const recommended = useMemo(() => {
    const rankedIds = (state.daily?.ranked_job_ids ?? []).map(String);
    const rank = new Map(rankedIds.map((id: string, index: number) => [id, index]));
    return [...state.jobs].filter((job) => String(job.status ?? "open") !== "archived").sort((a, b) => {
      const left = rank.has(String(a.id)) ? Number(rank.get(String(a.id))) : 9999;
      const right = rank.has(String(b.id)) ? Number(rank.get(String(b.id))) : 9999;
      return left - right || Number(b.recommendation?.score ?? 0) - Number(a.recommendation?.score ?? 0);
    }).slice(0, 8);
  }, [state.daily, state.jobs]);
  const recommendationGroups = useMemo(() => groupDailyRecommendations(recommended, { seenJobIds: state.daily?.ranked_job_ids ?? [] }), [recommended, state.daily]);
  const onboarding = useMemo(() => buildOnboardingChecklist({
    profileCompleteness: state.completeness.score ?? 0,
    resumeCount: state.resumes.length,
    sourceCount: state.sources.filter((source) => source.enabled !== false).length,
    jobCount: state.jobs.length,
    recommendationCount: (state.daily?.ranked_job_ids ?? []).length,
  }), [state]);

  const ready = state.applications.filter((item) => item.status === "ready_to_submit" && item.readiness?.ready_to_submit === true);
  const blocked = state.applications.filter((item) => item.status !== "submitted" && !(item.status === "ready_to_submit" && item.readiness?.ready_to_submit === true));
  const latestRun = state.runs[0] ?? null;
  const metrics = state.analytics?.analytics?.metrics ?? {};

  const actions = [
    state.completeness.score < 80 ? { tone: "warn", title: "完善求职画像", copy: `当前完整度 ${state.completeness.score ?? 0}%，补齐后推荐会更准确。`, href: "/profile", label: "完善画像" } : null,
    state.jobs.length === 0 ? { tone: "warn", title: "岗位池还是空的", copy: "导入任意招聘平台的真实岗位链接和 JD，系统会自动解析、匹配。", href: "/jobs#import-job", label: "导入岗位" } : null,
    ready.length ? { tone: "ok", title: `${ready.length} 个岗位已经可以投递`, copy: "简历和材料已匹配，等待你最后确认。", href: "/applications", label: "继续投递" } : null,
    blocked.length ? { tone: "neutral", title: `${blocked.length} 个投递需要补齐`, copy: "查看缺少的岗位条件、简历或项目证据。", href: "/applications", label: "查看缺口" } : null,
  ].filter(Boolean) as Array<Record<string, string>>;

  async function refresh() {
    setLoading(true);
    setMessage("正在重新生成今日推荐与投递包…");
    try {
      await controlFetch("/api/control/automation", { method: "POST", body: JSON.stringify({ action: "run_now" }) });
      await load();
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新生成失败");
      setLoading(false);
    }
  }

  async function markNotificationsRead() {
    try {
      await controlFetch("/api/control/notifications", { method: "PATCH", body: JSON.stringify({}) });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "消息状态更新失败，请重试。");
    }
  }

  if (loading) return <WorkspaceState tone="loading" title="正在整理今日简报" description="正在读取岗位、画像和投递进度，请稍候。"/>;
  if (message && !state.profile) return <WorkspaceState tone="error" title="今日简报暂时无法加载" description={message} action={<button type="button" className="cc-button" onClick={() => void load()}>重新加载</button>}/>;

  return <section className="platform-workspace">
    <WorkspaceHeading title="今日简报" description="先看推荐，再补缺口。一次完成最重要的一步。" action={<button className="platform-refresh" onClick={() => void refresh()} disabled={loading}><Sparkles size={16}/>{loading ? "生成中" : "重新生成推荐"}</button>}/>
    {message ? <div className="platform-message">{message}</div> : null}

    {state.unread > 0 ? <section className="platform-notification-strip"><div><strong>{state.unread} 条新消息</strong><span>{state.notifications.filter((item) => !item.read_at).slice(0, 3).map((item) => item.body || item.title).join(" · ")}</span>{state.notifications.find((item) => !item.read_at && item.type === "profile_search_review")?.action_url ? <Link href={state.notifications.find((item) => !item.read_at && item.type === "profile_search_review")?.action_url}>查看岗位复核报告</Link> : null}</div><button type="button" onClick={() => void markNotificationsRead()}>标记已读</button></section> : null}

    {state.jobs.length === 0 ? <section className="platform-welcome">
      <div className="platform-welcome-mark"><Sparkles size={22}/></div>
      <div className="platform-welcome-copy"><h2>欢迎来到 Career Copilot</h2><p>先补齐画像，再导入岗位；系统会生成可审核的推荐和投递材料。</p><div className="platform-welcome-actions"><Link href="/profile" className="primary-button">先完善我的画像<ArrowRight size={15}/></Link><Link href="/jobs#import-job" className="ghost-button">直接导入岗位</Link></div></div>
    </section> : null}

    {!onboarding.finished ? <details className="platform-panel platform-onboarding-panel">
      <summary className="platform-panel-head"><div><h2><ListChecks size={19}/>首次使用引导</h2><p>完成画像、简历和岗位来源后，推荐才有依据。下一步：<strong className="onboarding-next-label">{onboarding.steps.find((step) => !step.done)?.label ?? "完成全部"}</strong></p></div><strong>{onboarding.score}%</strong></summary>
      <div className="platform-onboarding-steps">{onboarding.steps.map((step) => <Link key={step.key} href={step.href} className={`${step.done ? "done" : "pending"}${!step.done && onboarding.steps.findIndex((s) => !s.done) === onboarding.steps.findIndex((s) => s.key === step.key) ? " next" : ""}`}><span>{step.done ? <CheckCircle2 size={16}/> : <CircleAlert size={16}/>}</span><strong>{step.label}</strong><small>{step.detail}</small><ArrowRight size={14}/></Link>)}</div>
    </details> : null}

    <div className="cc-overview-stats" aria-label="今日概览">
      <span>开放岗位<strong>{state.pool.open ?? state.jobs.length}</strong></span>
      <span>今日推荐<strong>{recommended.length}</strong></span>
      <span>可投递<strong>{ready.length}</strong></span>
    </div>

    <section className="platform-flow-strip" aria-label="求职流程摘要">
      <article className="p0"><span className="platform-flow-icon" aria-hidden="true"><ListFilter size={16}/></span><div><span>P0 · 岗位池</span><strong>{state.pool.open ?? state.jobs.length} 个开放岗位</strong><small>{state.jobs.length ? "已进入匹配" : "导入 JD 后开始"}</small></div></article>
      <ArrowRight className="platform-flow-arrow" size={16}/>
      <article className="p1 active"><span className="platform-flow-icon" aria-hidden="true"><Target size={16}/></span><div><span>P1 · 今日推荐</span><strong>{recommended.length} 个匹配结果</strong><small>{recommended.length ? "按当前画像排序" : "等待岗位或推荐"}</small></div></article>
      <ArrowRight className="platform-flow-arrow" size={16}/>
      <article className="p2"><span className="platform-flow-icon" aria-hidden="true"><ClipboardCheck size={16}/></span><div><span>P2 · 投递准备</span><strong>{ready.length} 个可投递</strong><small>{blocked.length ? `${blocked.length} 个待补齐` : "没有阻塞事项"}</small></div></article>
    </section>

    <div className="platform-overview-grid">
      <section className="platform-panel platform-priority-panel">
        <header className="platform-panel-head"><div><h2>今日推荐</h2><p>{state.daily?.recommendation_date ? `${state.daily.recommendation_date} 已按当前画像完成推荐。` : "按当前画像显示岗位、分数和匹配理由。"}</p></div><Link href="/applications">推荐设置<ArrowRight size={15}/></Link></header>
        <div className="platform-recommendation-groups">
          {Object.values(recommendationGroups).filter((group) => group.jobs.length).map((group) => <section key={group.key}><header><strong>{group.label}</strong><small>{group.jobs.length} 个</small></header><div className="platform-priority-list">{group.jobs.map((job) => <Link href={`/jobs?job=${encodeURIComponent(String(job.id))}`} key={job.id} className="platform-priority-row">
            <span className={`platform-score fit-${job.recommendation?.fit ?? "possible"}`} style={{ "--score": `${jobScore(job) ?? 0}%` } as CSSProperties}>{jobScore(job) ?? "--"}</span>
            <span className="platform-priority-copy"><small>{job.company_name || "待核验公司"}</small><strong>{job.title}</strong><em>{[job.city, job.workplace, job.source_name].filter(Boolean).join(" · ") || "岗位信息待完善"}</em></span>
            <span className="platform-priority-fit">{job.recommendation?.label ?? "待推荐"}</span>
          </Link>)}</div></section>)}
          {!recommended.length ? <div className="platform-empty-state"><BriefcaseBusiness size={22}/><strong>还没有岗位</strong><p>完善画像并导入岗位后，每日推荐会出现在这里。</p><Link href="/jobs#import-job">导入岗位</Link></div> : null}
        </div>
      </section>

      <section className="platform-panel platform-action-panel">
        <header className="platform-panel-head"><div><h2>今天需要处理</h2><p>只保留会阻止推荐或投递的事项。</p></div></header>
        <div className="platform-action-list">
          {actions.length ? actions.slice(0, 5).map((item) => <Link href={item.href} key={`${item.title}-${item.href}`} className={`platform-action-item ${item.tone}`}>
            {item.tone === "ok" ? <CheckCircle2 size={18}/> : item.tone === "warn" ? <CircleAlert size={18}/> : <Clock3 size={18}/>}<span><strong>{item.title}</strong><small>{item.copy}</small></span><em>{item.label}<ArrowRight size={14}/></em>
          </Link>) : <div className="platform-empty-state compact"><CheckCircle2 size={21}/><strong>当前没有阻塞事项</strong><p>可以直接浏览岗位池或查看数据看板。</p></div>}
        </div>
      </section>
    </div>

    <section className="platform-panel platform-data-overview">
      <header className="platform-panel-head"><div><h2>招聘数据看板</h2><p>来源、申请、回复、面试四项真实数据。</p></div><Link href="/analytics">完整数据看板<ArrowRight size={15}/></Link></header>
      <details className="platform-subfold">
        <summary>展开查看数据</summary>
      <div className="platform-data-grid">
        <article><span>最近来源任务</span><strong>{latestRun?.status ?? "尚未运行"}</strong><small>{latestRun ? `扫描 ${latestRun.jobs_seen ?? 0} · 新增 ${latestRun.jobs_imported ?? 0} · 更新 ${latestRun.jobs_updated ?? 0}` : "前往岗位来源运行发现"}</small></article>
        <article><span>近 30 天申请</span><strong>{metrics.applications ?? state.applications.length}</strong><small>准备、投递和后续状态</small></article>
        <article><span>回复率</span><strong>{metrics.reply_rate ?? 0}%</strong><small>以真实投递状态计算</small></article>
        <article><span>面试率</span><strong>{metrics.interview_rate ?? 0}%</strong><small>避免用模拟数据冒充结果</small></article>
      </div>
      </details>
    </section>

    <details className="platform-shortcuts-fold">
      <summary>更多工作区入口 <span>按需展开</span><ArrowRight size={15}/></summary>
      <div className="platform-shortcut-grid">
      <Link href="/sources"><DatabaseZap size={18}/><span><strong>岗位来源</strong><small>管理自动 ATS 和链接导入</small></span></Link>
      <Link href="/profile"><UserRound size={18}/><span><strong>我的画像</strong><small>决定推荐排序和资格判断</small></span></Link>
      <Link href="/resumes"><FileText size={18}/><span><strong>简历版本</strong><small>让系统自动选择最匹配版本</small></span></Link>
      <Link href="/applications"><Send size={18}/><span><strong>投递管理</strong><small>查看待投递、缺口和历史</small></span></Link>
      </div>
    </details>
  </section>;
}
