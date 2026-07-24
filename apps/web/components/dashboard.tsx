"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, ChevronRight, Clock3, Cpu, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { jobs, metrics } from "@/lib/mock-data";
import type { JobCardData } from "@/lib/types";

const segments = ["全部","远程优先","南通崇川","南京建邺/浦口","上海/苏州/杭州"];

export function Dashboard() {
  const [segment,setSegment] = useState("全部");
  const [selected,setSelected] = useState<JobCardData>(jobs[0]);
  const filtered = useMemo(() => segment==="全部" ? jobs : jobs.filter(j=>j.segment===segment),[segment]);
  return <div className="dashboard-grid">
    <section className="overview-column">
      <div className="metric-grid">{metrics.map(m=><article className="metric" key={m.label}><span>{m.label}</span><strong>{m.value}</strong><small>{m.delta}</small></article>)}</div>
      <Link href="/engineering" className="engineering-callout"><div className="engineering-callout-icon"><Cpu size={17}/></div><div><strong>工程证据已启用</strong><span>模型健康检查 · 生成指标 · AI Coding 交付账本</span></div><ArrowUpRight size={16}/></Link>
      <div className="section-heading"><div><span className="eyebrow">Priority Queue</span><h2>今日优先岗位</h2></div><button className="ghost-button">查看全部 <ArrowUpRight size={14}/></button></div>
      <div className="segment-tabs">{segments.map(item=><button key={item} onClick={()=>setSegment(item)} className={segment===item?"active":""}>{item}</button>)}</div>
      <div className="job-list">{filtered.map(job=><button key={job.id} className={selected.id===job.id?"job-row selected":"job-row"} onClick={()=>setSelected(job)}>
        <div className={`grade grade-${job.grade.toLowerCase()}`}>{job.grade}</div>
        <div className="job-main"><div className="job-title-line"><strong>{job.title}</strong><span>{job.status}</span></div><div className="job-meta"><span>{job.company}</span><span><MapPin size={13}/>{job.location}</span><span>{job.salary}</span></div><div className="skill-line">{job.matchedSkills.slice(0,4).map(skill=><span key={skill}>{skill}</span>)}</div></div>
        <div className="score"><strong>{job.score}</strong><span>匹配分</span></div><ChevronRight size={18}/>
      </button>)}</div>
    </section>
    <aside className="detail-panel">
      <div className="detail-head"><div className={`grade grade-${selected.grade.toLowerCase()}`}>{selected.grade}</div><div><span className="eyebrow">{selected.segment}</span><h3>{selected.title}</h3><p>{selected.company} · {selected.companyTier}</p></div></div>
      <div className="score-orbit"><div><strong>{selected.score}</strong><span>综合匹配</span></div><div className="orbit-copy"><span><Check size={14}/>技术栈命中</span><span><Check size={14}/>地区优先级命中</span><span><Clock3 size={14}/>等待 HR 核验</span></div></div>
      <div className="detail-section"><h4>岗位实际工作</h4><p>{selected.summary}</p></div>
      <div className="detail-section"><h4>匹配证据</h4><ul><li>Camera Market Strategy System：FastAPI、PostgreSQL、Docker</li><li>LangGraph/RAG 项目：状态工作流、中文检索、来源引用</li><li>PhotoAtelier：产品流程、交互设计与测试</li></ul></div>
      <div className="risk-box"><ShieldCheck size={17}/><div><strong>面试风险</strong><p>{selected.risk}</p></div></div>
      <div className="resume-box"><span>推荐简历</span><strong>{selected.resumeVersion}</strong><small>放大：{selected.matchedSkills.slice(0,3).join(" · ")}</small></div>
      <div className="approval-actions"><button className="ghost-button">暂不投递</button><button className="primary-button"><Sparkles size={15}/>生成投递包</button></div>
    </aside>
  </div>;
}
