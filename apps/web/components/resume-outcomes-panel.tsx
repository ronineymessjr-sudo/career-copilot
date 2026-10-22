"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, SlidersHorizontal } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type Row = Record<string, any>;

function percent(value: unknown) {
  return value === null || value === undefined ? "—" : `${value}%`;
}

function confidenceRange(value: unknown, english: boolean) {
  if (!Array.isArray(value) || value.length !== 2) return english ? "Not enough data" : "暂无可计算区间";
  return `${value[0]}%–${value[1]}%`;
}

function channelLabel(value: string, english: boolean) {
  const labels = english ? {
    email: "Email",
    referral: "Referral",
    platform: "Job platform",
    company_form: "Company site",
    "未记录渠道": "Unspecified",
  } : {
    email: "邮件",
    referral: "内推",
    platform: "招聘平台",
    company_form: "公司官网",
    "未记录渠道": "未记录渠道",
  };
  return (labels as Record<string, string>)[value] ?? value;
}

function personaLabel(value: string, english: boolean) {
  const labels = english ? {
    ai_product: "AI product",
    agent_engineer: "AI engineer",
    ai_solution: "AI solutions",
    general: "General",
  } : {
    ai_product: "AI 产品",
    agent_engineer: "AI 工程",
    ai_solution: "AI 解决方案",
    general: "通用",
  };
  return (labels as Record<string, string>)[value] ?? value;
}

export function ResumeOutcomesPanel({ analytics, demo = false, loading = false, unavailable = false }: { analytics: Row | undefined; demo?: boolean; loading?: boolean; unavailable?: boolean }) {
  const { locale } = useLocale();
  const english = locale === "en";
  const report = analytics?.resume_experiments;
  const [roleFamily, setRoleFamily] = useState("all");
  const [channel, setChannel] = useState("all");
  const roleFamilies = useMemo<string[]>(() => [...new Set<string>((report?.cohorts ?? []).map((row: Row) => String(row.role_family ?? "未标注方向")))].sort(), [report?.cohorts]);
  const channels = useMemo<string[]>(() => [...new Set<string>((report?.cohorts ?? []).flatMap((row: Row) => Array.isArray(row.channels) ? row.channels.map(String) : []))].sort(), [report?.cohorts]);
  const rows = useMemo(() => (report?.cohorts ?? [])
    .filter((row: Row) => roleFamily === "all" || row.role_family === roleFamily)
    .map((row: Row) => {
      const metrics = channel === "all" ? row : (row.by_channel ?? []).find((item: Row) => item.channel === channel);
      return metrics ? { ...row, ...metrics, key: row.key, label: row.label, role_family: row.role_family, persona: row.persona, version_no: row.version_no, link_status: row.link_status } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => Number(b.submitted ?? 0) - Number(a.submitted ?? 0)), [report?.cohorts, roleFamily, channel]);
  const observedLeader = useMemo(() => rows.filter((row: any) => row.link_status === "linked" && Number(row.submitted) > 0)
    .sort((a: any, b: any) => Number(b.reply_rate ?? 0) - Number(a.reply_rate ?? 0))[0], [rows]);
  const unlinkedSubmissions = Number(report?.unlinked?.submitted ?? 0);
  const windowLabel = report?.window_days === 0 ? (english ? "all recorded time" : "全部") : (english ? `the past ${report?.window_days ?? 90} days` : `近 ${report?.window_days ?? 90} 天`);

  return <section className="resume-outcomes-panel" aria-labelledby="resume-outcomes-title">
    <header className="resume-outcomes-heading">
      <div className="resume-outcomes-title">
        <BarChart3 size={17} aria-hidden="true" />
        <div>
          <h3 id="resume-outcomes-title">{english ? "Resume version review" : "简历版本复盘"}</h3>
          <p>{english ? "Connect application outcomes to the resume actually sent, then see what to refine next." : "把实际投递结果回连到当时使用的简历版本，观察哪些材料值得继续迭代。"}</p>
        </div>
      </div>
      <div className="resume-outcomes-filters" aria-label={english ? "Resume comparison filters" : "简历版本对照筛选"}>
        <SlidersHorizontal size={14} aria-hidden="true" />
        <label><span>{english ? "Target role" : "岗位方向"}</span><select value={roleFamily} onChange={(event) => setRoleFamily(event.target.value)}>
          <option value="all">{english ? "All roles" : "全部方向"}</option>
          {roleFamilies.map((value: string) => <option key={value} value={value}>{value}</option>)}
        </select></label>
        <label><span>{english ? "Application source" : "投递渠道"}</span><select value={channel} onChange={(event) => setChannel(event.target.value)}>
          <option value="all">{english ? "All sources" : "全部渠道"}</option>
          {channels.map((value: string) => <option key={value} value={value}>{channelLabel(value, english)}</option>)}
        </select></label>
      </div>
    </header>

    {demo ? <div className="resume-outcomes-empty">{english ? "The demo has no personal application history, so it does not show fabricated resume outcomes." : "演示视图不包含个人投递历史，因此不会展示虚构的简历效果。"}</div> : loading ? <div className="resume-outcomes-empty">{english ? "Loading personal application data…" : "正在读取个人投递数据…"}</div> : unavailable ? <div className="resume-outcomes-empty">{english ? "Personal application data could not be loaded. This does not mean there were no applications." : "当前无法读取个人投递数据，这不代表没有投递记录。"}</div> : rows.length ? <>
      {observedLeader && rows.filter((row: any) => row.link_status === "linked" && Number(row.submitted) > 0).length > 1 ? <div className="resume-outcomes-observation">
        {english ? <>Within this filter, the highest observed reply rate is <strong>{observedLeader.label}</strong> ({percent(observedLeader.reply_rate)}, {observedLeader.submitted} submitted). This is an observed association, not proof that the resume version caused the outcome.</> : <>当前筛选下，观察到的回复率较高版本是 <strong>{observedLeader.label}</strong>（{percent(observedLeader.reply_rate)}，{observedLeader.submitted} 次投递）。这只是记录中的相关性，不代表简历版本单独造成了结果。</>}
      </div> : null}
      <div className="resume-outcomes-table-wrap">
        <table className="resume-outcomes-table">
          <thead><tr><th scope="col">{english ? "Resume version" : "简历版本"}</th><th scope="col">{english ? "Target role" : "岗位方向"}</th><th scope="col">{english ? "Submitted" : "已投递"}</th><th scope="col">{english ? "Reply rate · 95% interval" : "回复率 · 95%区间"}</th><th scope="col">{english ? "Awaiting" : "待反馈"}</th><th scope="col">{english ? "Follow-up due" : "到期跟进"}</th><th scope="col">{english ? "Interviews" : "面试"}</th><th scope="col">Offer</th></tr></thead>
          <tbody>{rows.map((row: any) => <tr key={`${row.key}:${channel}`}>
            <th scope="row"><span className="resume-outcomes-version">{row.label}{row.version_no ? ` · v${row.version_no}` : ""}</span><span className={`resume-outcomes-link ${row.link_status === "linked" ? "is-linked" : "is-name-only"}`}>{row.link_status === "linked" ? (row.persona ? personaLabel(row.persona, english) : (english ? "Version linked" : "已关联版本")) : (english ? "Name only" : "仅名称匹配")}</span></th>
            <td>{row.role_family}</td>
            <td>{row.submitted}<small> / {row.applications} {english ? "applications" : "条申请"}</small></td>
            <td><strong>{percent(row.reply_rate)}</strong><small>{confidenceRange(row.reply_rate_ci_95, english)}</small></td>
            <td>{row.awaiting_feedback}</td>
            <td>{row.follow_up_due}</td>
            <td>{row.interviews}</td>
            <td>{row.offers}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="resume-outcomes-method">{english ? `Based on ${windowLabel}; submitted applications are the denominator. The interval is a 95% Wilson binomial interval. Recent applications may still be awaiting a response, not rejected. Name-only records are not treated as exact version comparisons. Roles, employers, timing, and channels also affect outcomes, so this is not a causal estimate.` : `按${windowLabel}记录统计；回复率分母为已投递申请，区间采用 Wilson 95% 二项比例区间。近期投递可能仍在等待反馈，不等同于拒绝；仅名称记录不作为精确版本对比。不同岗位、公司、时间和渠道仍会影响结果，不能据此作因果判断。`}</p>
      {unlinkedSubmissions > 0 ? <p className="resume-outcomes-unlinked">{english ? `${unlinkedSubmissions} submitted applications have no linked resume version and are excluded. Select a resume version when preparing the next application to make later outcomes traceable.` : `另有 ${unlinkedSubmissions} 次已投递没有关联简历版本，因此未放入版本比较。下次生成申请材料时选择简历版本，后续结果才可追溯。`}</p> : null}
    </> : <div className="resume-outcomes-empty">
      <div><strong>{english ? (roleFamily !== "all" || channel !== "all" ? "No comparable applications match these filters" : "No resume version outcomes to compare yet") : (roleFamily !== "all" || channel !== "all" ? "这个筛选条件下还没有可比较的投递" : "还没有可比较的简历版本结果")}</strong><span>{english ? "Link a resume version when preparing an application. After submission and outcome updates, the review will appear here." : "生成申请材料时关联一个简历版本；确认投递并记录回复后，这里会自动形成版本复盘。"}</span></div>
      <a href="/resumes">{english ? "Browse resume versions" : "查看简历版本"} <ArrowRight size={13} aria-hidden="true" /></a>
    </div>}
  </section>;
}
