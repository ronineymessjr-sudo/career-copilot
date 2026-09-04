"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardCheck, MessageSquareText, Plus, RefreshCw, ShieldCheck, Target } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Row = Record<string, any>;

function localDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function InterviewsWorkspace() {
  const [interviews, setInterviews] = useState<Row[]>([]);
  const [applications, setApplications] = useState<Row[]>([]);
  const [gaps, setGaps] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ application_id: "", round_name: "技术一面", scheduled_at: "", mode: "video", interview_type: "technical", interviewer: "" });

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<{ interviews: Row[]; applications: Row[]; skill_gaps: Row[] }>("/api/control/interviews");
      setInterviews(result.interviews ?? []); setApplications(result.applications ?? []); setGaps(result.skill_gaps ?? []); setMessage("");
      setForm((current) => ({ ...current, application_id: current.application_id || String(result.applications?.[0]?.id ?? "") }));
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载失败"); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const scheduled = useMemo(() => interviews.filter((item) => item.status === "scheduled"), [interviews]);
  const completed = useMemo(() => interviews.filter((item) => item.status === "completed"), [interviews]);
  const openGaps = useMemo(() => gaps.filter((item) => item.status === "open" || item.status === "in_progress"), [gaps]);

  async function createInterview(event: React.FormEvent) {
    event.preventDefault(); setBusy("create");
    try {
      await controlFetch("/api/control/interviews", { method: "POST", body: JSON.stringify(form) });
      setMessage("面试已创建。系统不会替你接受邀请或回复招聘方。");
      setForm((current) => ({ ...current, scheduled_at: "", interviewer: "" })); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "创建失败"); }
    finally { setBusy(""); }
  }

  async function prepare(item: Row) {
    setBusy(`prepare-${item.id}`);
    try { await controlFetch(`/api/control/interviews/${item.id}/prepare`, { method: "POST" }); setMessage("准备计划已根据最新岗位、材料和技能缺口重新生成。"); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "生成失败"); }
    finally { setBusy(""); }
  }

  async function complete(item: Row) {
    const question = window.prompt("记录一个最有代表性的面试问题", "")?.trim() ?? "";
    if (!question) return;
    const rating = Number(window.prompt("自评分 1–5", "3") ?? "3");
    const notes = window.prompt("复盘：哪里答得好，哪里需要改进？", "") ?? "";
    const outcome = window.prompt("结果或当前判断（pending / passed / failed / next_round）", "pending") ?? "pending";
    let applicationStatus = "interview";
    if (/offer/i.test(outcome)) applicationStatus = "offer";
    if (/fail|reject|未通过/i.test(outcome)) applicationStatus = "rejected";
    const confirmStatus = window.confirm(`是否同时把投递状态明确更新为 ${applicationStatus.toUpperCase()}？\n取消则只保存面试复盘。`);
    setBusy(`complete-${item.id}`);
    try {
      await controlFetch(`/api/control/interviews/${item.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          outcome, notes,
          feedback: [{ question, category: "other", self_rating: Math.max(1, Math.min(rating || 3, 5)), result: rating <= 2 ? "weak" : rating >= 4 ? "strong" : "mixed", notes }],
          application_status: applicationStatus,
          confirm_status_change: confirmStatus,
        }),
      });
      setMessage("面试复盘已保存。低分项已转入技能缺口；系统没有自动接受下一轮或 Offer。"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "复盘保存失败"); }
    finally { setBusy(""); }
  }

  async function updateGap(item: Row, status: string) {
    setBusy(`gap-${item.id}`);
    try { await controlFetch(`/api/control/skill-gaps/${item.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "更新失败"); }
    finally { setBusy(""); }
  }

  return <section className="control-panel interview-panel">
    <header className="control-heading"><div><span className="eyebrow">Interview learning loop</span><h2>面试管理</h2><p>先准备下一场，再处理技能缺口；复盘只记录，不替你接受下一轮或 Offer。</p></div><button className="icon-button" onClick={() => void load()}><RefreshCw size={15}/></button></header>
    {message ? <div className="control-message">{message}</div> : null}
    <div className="interview-summary-grid">
      <article><CalendarClock size={17}/><strong>{scheduled.length}</strong><span>待进行面试</span></article>
      <article><ClipboardCheck size={17}/><strong>{completed.length}</strong><span>已完成复盘</span></article>
      <article><Target size={17}/><strong>{openGaps.length}</strong><span>开放技能缺口</span></article>
    </div>
    <nav className="platform-priority-rail" aria-label="面试管理优先级">
      <a className="platform-priority-item p0" href="#interview-list"><span>P0 · 现在做</span><strong>{scheduled.length} 场待准备</strong><small>先打开下一场面试计划</small></a>
      <a className="platform-priority-item p1" href="#skill-gaps"><span>P1 · 接着处理</span><strong>{openGaps.length} 个技能缺口</strong><small>按严重度补强并标记进度</small></a>
      <a className="platform-priority-item p2" href="#interview-list"><span>P2 · 需要时看</span><strong>{completed.length} 场已复盘</strong><small>回看证据和自评变化</small></a>
    </nav>
    <div className="interview-layout">
      <div className="interview-list" id="interview-list">
        {interviews.length === 0 ? <div className="empty-state"><MessageSquareText size={25}/><strong>暂无面试记录</strong><span>从已准备或已投递的岗位创建第一场面试。</span></div> : interviews.map((item) => {
          const job = item.job ?? {}; const plan = item.preparation_plan ?? {}; const itemGaps = item.skill_gaps ?? [];
          return <article className="interview-card" key={item.id}>
            <div className="interview-card-head"><div><span>{job.company_name ?? "待核验公司"}</span><h3>{job.title ?? "岗位"} · {item.round_name}</h3><p>{localDateTime(item.scheduled_at)} · {item.mode || "方式待定"} · {item.interview_type}</p></div><div className="readiness-score"><strong>{item.readiness_score ?? 0}</strong><span>准备度</span></div></div>
            <div className="job-status-strip"><span className={item.status === "completed" ? "ok" : "warn"}>{item.status}</span><span>{item.preparation_status}</span>{item.outcome ? <span>{item.outcome}</span> : null}</div>
            {Array.isArray(plan.focus_areas) ? <div className="prep-section"><strong>重点准备</strong><div className="tag-row">{plan.focus_areas.slice(0, 6).map((value: string) => <span key={value}>{value}</span>)}</div></div> : null}
            {Array.isArray(plan.likely_questions) ? <div className="prep-section"><strong>高概率问题</strong><ol>{plan.likely_questions.slice(0, 4).map((value: string) => <li key={value}>{value}</li>)}</ol></div> : null}
            {item.feedback_summary?.question_count ? <div className="interview-proof"><CheckCircle2 size={15}/><span>已记录 {item.feedback_summary.question_count} 个问题 · 平均自评 {item.feedback_summary.average_self_rating ?? "-"}</span></div> : null}
            {itemGaps.length ? <div className="blocker-box warning"><Target size={15}/><div><strong>本场技能缺口</strong><p>{itemGaps.map((gap: Row) => gap.skill).join(" · ")}</p></div></div> : null}
            <div className="card-actions"><button className="ghost-button" disabled={busy === `prepare-${item.id}`} onClick={() => void prepare(item)}><ShieldCheck size={14}/>重新生成准备</button>{item.status !== "completed" ? <button className="primary-button" disabled={busy === `complete-${item.id}`} onClick={() => void complete(item)}><ClipboardCheck size={14}/>完成并复盘</button> : null}</div>
          </article>;
        })}
      </div>
      <aside className="interview-side">
        <form className="control-form interview-create" onSubmit={createInterview}><div><span className="eyebrow">New interview</span><h3>创建面试轮次</h3></div>
          <label>对应投递<select value={form.application_id} onChange={(event) => setForm({ ...form, application_id: event.target.value })}>{applications.map((item) => <option value={item.id} key={item.id}>{item.job?.company_name ?? "公司"} · {item.job?.title ?? item.id}</option>)}</select></label>
          <label>轮次名称<input value={form.round_name} onChange={(event) => setForm({ ...form, round_name: event.target.value })}/></label>
          <label>时间<input type="datetime-local" value={form.scheduled_at} onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}/></label>
          <label>类型<select value={form.interview_type} onChange={(event) => setForm({ ...form, interview_type: event.target.value })}><option value="technical">技术</option><option value="product">产品</option><option value="hr">HR</option><option value="case">案例</option><option value="behavioral">行为</option><option value="mixed">综合</option></select></label>
          <label>形式<select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}><option value="video">视频</option><option value="phone">电话</option><option value="onsite">线下</option><option value="async">异步作业</option></select></label>
          <label>面试官<input value={form.interviewer} onChange={(event) => setForm({ ...form, interviewer: event.target.value })}/></label>
          <button className="primary-button" disabled={!form.application_id || !form.scheduled_at || busy === "create"}><Plus size={14}/>创建面试</button>
        </form>
        <div className="skill-gap-panel" id="skill-gaps"><div><span className="eyebrow">Skill gaps</span><h3>技能缺口队列</h3></div>{openGaps.length === 0 ? <p className="muted-copy">暂无开放缺口。完成面试复盘后，低分项会自动进入这里。</p> : openGaps.slice(0, 8).map((gap) => <article key={gap.id}><div><strong>{gap.skill}</strong><span>严重度 {gap.severity}/5</span></div><p>{gap.next_action || gap.evidence}</p><div><button onClick={() => void updateGap(gap, "in_progress")}>进行中</button><button onClick={() => void updateGap(gap, "resolved")}>已解决</button></div></article>)}</div>
      </aside>
    </div>
  </section>;
}
