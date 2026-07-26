"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenCheck, Bot, BriefcaseBusiness, ChartNoAxesCombined, Cpu, DatabaseZap, FileText, Gauge, GraduationCap, Inbox, MessageSquareText, PlaySquare, Radar, Settings, Sparkles } from "lucide-react";

const nav = [
  ["/", "今日简报", Gauge],
  ["/playground", "Agent Playground", PlaySquare],
  ["/jobs", "岗位发现", BriefcaseBusiness],
  ["/sources", "岗位来源", Radar],
  ["/career-vault", "Career Vault", DatabaseZap],
  ["/knowledge", "知识检索", BookOpenCheck],
  ["/applications", "投递管理", Inbox],
  ["/agents", "Agent 中心", Bot],
  ["/resumes", "AI 简历", FileText],
  ["/interviews", "面试管理", MessageSquareText],
  ["/analytics", "数据洞察", ChartNoAxesCombined],
  ["/engineering", "工程证据", Cpu],
  ["/settings", "设置", Settings],
] as const;

export function AppShell({children}:{children:React.ReactNode}) {
  const pathname = usePathname();
  return <div className="app-frame">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={17}/></div><div><strong>Career Copilot</strong><span>Evidence-driven OS</span></div></div>
      <nav>{nav.map(([href,label,Icon]) => <Link key={href} href={href} className={pathname===href?"nav-item active":"nav-item"}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-card"><GraduationCap size={18}/><div><strong>2028 届 AI 本科</strong><span>远程 · 崇川 · 建邺 · 浦口</span></div></div>
    </aside>
    <main className="main-area"><header className="topbar"><div><span className="eyebrow">AI Internship Command Center</span><h1>把求职变成一套可复用的系统</h1></div><div className="topbar-actions"><Link className="ghost-button" href="/playground">公开 Demo</Link><Link className="primary-button" href="/jobs"><Sparkles size={15}/>进入投递控制台</Link></div></header>{children}</main>
  </div>;
}
