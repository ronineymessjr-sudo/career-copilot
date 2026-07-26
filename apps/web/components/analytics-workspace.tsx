"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarRange, CheckCircle2, RefreshCw, Target, TriangleAlert } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Row = Record<string, any>;
const STAGE_LABELS: Record<string, string> = { prepared: "已准备", submitted: "已投递", replied: "已回复", interviewed: "已面试", offered: "Offer" };

function RateTable({ title, rows }: { title: string; rows: Row[] }) {
  return <section className="analytics-table"><h3>{title}</h3><div className="analytics-table-head"><span>维度</span><span>样本</span><span>回复率</span><span>面试率</span><span>Offer率</span></div>{rows.length ? rows.slice(0, 8).map((row) => <div className="analytics-table-row" key={row.key}><strong>{row.label}</strong><span>{row.applications}</span><span>{row.reply_rate}%</span><span>{row.interview_rate}%</span><span>{row.offer_rate}%</span></div>) : <p className="muted-copy">样本不足。</p>}</section>;
}

export function AnalyticsWorkspace({ compact = false }: { compact?: boolean }) {
  const [days, setDays] = useState(90); const [data, setData] = useState<Row | null>(null); const [reviews, setReviews] = useState<Row[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const [analytics, weekly] = await Promise.all([
        controlFetch<Row>(`/api/control/analytics?days=${days}`),
        controlFetch<{ weekly_reviews: Row[] }>("/api/control/weekly-review"),
      ]);
      setData(analytics); setReviews(weekly.weekly_reviews ?? []); setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加载失败"); }
  }, [days]);
  useEffect(() => { void load(); }, [load]);
  const metrics = data?.analytics?.metrics ?? {}; const funnel = data?.analytics?.funnel ?? [];
  const maxCount = useMemo(() => Math.max(1, ...funnel.map((item: Row) => Number(item.count ?? 0))), [funnel]);
  async function generateReview() { setBusy(true); try { await controlFetch("/api/control/weekly-review", { method: "POST" }); setMessage("本周复盘已重新生成。"); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败"); } finally { setBusy(false); } }
  return <section className={compact ? "analytics-workspace compact" : "control-panel analytics-workspace"}>
    {!compact ? <header className="control-heading"><div><span className="eyebrow">Conversion and operations</span><h2>数据洞察</h2><p>按真实状态事件计算回复率、面试率和 Offer 转化，并监控岗位来源与控制面异常。</p></div><div className="heading-actions"><select className="window-select" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={30}>近 30 天</option><option value={90}>近 90 天</option><option value={365}>近一年</option><option value={0}>全部</option></select><button className="icon-button" onClick={() => void load()}><RefreshCw size={15}/></button></div></header> : null}
    {message ? <div className="control-message">{message}</div> : null}
    <div className="analytics-kpis">{[
      ["投递", metrics.submitted ?? 0, "人工确认完成"], ["回复率", `${metrics.reply_rate ?? 0}%`, `${metrics.replies ?? 0} 个回复`], ["面试率", `${metrics.interview_rate ?? 0}%`, `${metrics.interviews ?? 0} 次面试`], ["Offer率", `${metrics.offer_rate ?? 0}%`, `${metrics.offers ?? 0} 个结果`],
    ].map(([label, value, detail]) => <article key={String(label)}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</div>
    <div className="analytics-primary-grid">
      <section className="funnel-panel"><div className="panel-title"><BarChart3 size={16}/><div><strong>申请漏斗</strong><span>转化率以上一阶段为分母</span></div></div><div className="funnel-list">{funnel.map((item: Row) => <div key={item.stage}><div><strong>{STAGE_LABELS[item.stage] ?? item.stage}</strong><span>{item.count} · {item.conversion_from_previous}%</span></div><div className="funnel-track"><i style={{ width: `${Math.max(3, Number(item.count) / maxCount * 100)}%` }}/></div></div>)}</div></section>
      <section className="health-panel"><div className="panel-title"><Activity size={16}/><div><strong>生产健康</strong><span>最近任务和控制面事件</span></div></div><div className="health-row"><span>来源异常（最近 10 次）</span><strong>{data?.source_health?.failures_last_10 ?? 0}</strong></div><div className="health-row"><span>控制面失败</span><strong>{data?.observability?.failure_count ?? 0}</strong></div><div className="health-row"><span>待补技能</span><strong>{data?.open_skill_gaps?.length ?? 0}</strong></div>{data?.observability?.failure_count ? <div className="blocker-box"><TriangleAlert size={15}/><div><strong>需要检查</strong><p>{data.observability.recent_failures.map((item: Row) => item.event_name).join(" · ")}</p></div></div> : <div className="ready-box"><CheckCircle2 size={15}/>当前未记录新的控制面失败。</div>}</section>
    </div>
    {!compact ? <><div className="analytics-breakdowns"><RateTable title="渠道表现" rows={data?.analytics?.breakdowns?.channel ?? []}/><RateTable title="地区表现" rows={data?.analytics?.breakdowns?.location ?? []}/><RateTable title="简历版本" rows={data?.analytics?.breakdowns?.resume ?? []}/></div>
      <div className="review-grid"><section className="weekly-review"><div className="panel-title"><CalendarRange size={16}/><div><strong>周度复盘</strong><span>只生成分析与建议，不执行投递或沟通动作</span></div><button className="ghost-button" disabled={busy} onClick={() => void generateReview()}>重新生成</button></div>{reviews[0] ? <><div className="weekly-metrics">{Object.entries(reviews[0].summary?.metrics ?? {}).slice(0, 5).map(([key, value]) => <span key={key}>{key}: <strong>{String(value)}</strong></span>)}</div><h4>下一步</h4><ol>{(reviews[0].summary?.next_actions ?? []).map((item: string) => <li key={item}>{item}</li>)}</ol></> : <p className="muted-copy">尚未生成周报。</p>}</section>
      <section className="gap-summary"><div className="panel-title"><Target size={16}/><div><strong>高优先级技能缺口</strong><span>来自面试复盘和人工记录</span></div></div>{(data?.open_skill_gaps ?? []).slice(0, 6).map((gap: Row) => <article key={gap.id}><div><strong>{gap.skill}</strong><span>{gap.severity}/5</span></div><p>{gap.next_action || gap.evidence}</p></article>)}</section></div></> : null}
  </section>;
}
