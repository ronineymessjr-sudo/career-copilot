"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, ChartNoAxesCombined, Cpu, FileText, Gauge, GraduationCap, Inbox, MessageSquareText, Settings, Sparkles } from "lucide-react";

const nav = [
  ["/", "今日简报", Gauge],
  ["/jobs", "岗位发现", BriefcaseBusiness],
  ["/applications", "投递管理", Inbox],
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
    <main className="main-area"><header className="topbar"><div><span className="eyebrow">AI Internship Command Center</span><h1>把求职变成一套可复用的系统</h1></div><div className="topbar-actions"><button className="ghost-button">导入岗位</button><button className="primary-button"><Sparkles size={15}/>运行今日搜投</button></div></header>{children}</main>
  </div>;
}
