"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, BriefcaseBusiness, FileText, FileSearch, Home, LogOut, MessageSquare, Radar, Send, Settings, UserRound } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { FeedbackWidget } from "@/components/feedback-widget";

const primaryNav = [
  ["/", "今日简报", Home],
  ["/jobs", "岗位发现", BriefcaseBusiness],
  ["/sources", "岗位来源", Radar],
  ["/jd", "JD 深拆", FileSearch],
  ["/applications", "投递管理", Send],
  ["/analytics", "数据看板", BarChart3],
] as const;

const resourceNav = [
  ["/profile", "我的画像", UserRound],
  ["/resumes", "简历版本", FileText],
  ["/career-vault", "项目证据", BookOpenCheck],
  ["/settings", "设置", Settings],
  ["/feedback", "反馈中心", MessageSquare],
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  useEffect(() => { const supabase = getSupabaseBrowser(); if (!supabase) return; void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);
  async function signOut() { const supabase = getSupabaseBrowser(); await supabase?.auth.signOut(); router.replace("/login"); }
  return <div className="platform-frame">
    <aside className="platform-sidebar">
      <Link href="/" className="platform-brand" aria-label="Career Copilot 今日简报">
        <span className="platform-brand-mark">C</span>
        <span><strong>Career Copilot</strong><small>招聘聚合与投递工作台</small></span>
      </Link>
      <nav className="platform-nav" aria-label="核心工作区">
        <span className="platform-nav-label">工作台</span>
        {primaryNav.map(([href, label, Icon]) => <Link key={href} href={href} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/><span>{label}</span></Link>)}
        <span className="platform-nav-label resources">个人资料</span>
        {resourceNav.map(([href, label, Icon]) => <Link key={href} href={href} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/><span>{label}</span></Link>)}
      </nav>
      <div className="platform-sidebar-account"><span><UserRound size={16}/><small>{email || "当前账号"}</small></span><button type="button" onClick={() => void signOut()}><LogOut size={15}/>退出登录</button></div>
      <div className="platform-sidebar-note"><strong>完整岗位池</strong><span>浏览全部岗位，再按当前账号画像排序和解释。</span></div>
    </aside>
    <div className="platform-content">
      <header className="platform-mobile-header"><Link href="/" className="platform-mobile-brand"><span>C</span><strong>Career Copilot</strong></Link><nav>{primaryNav.map(([href, label]) => <Link key={href} href={href} className={isActive(pathname, href) ? "active" : ""}>{label}</Link>)}</nav></header>
      <main className="platform-main">{children}</main>
    </div>
    <FeedbackWidget />
  </div>;
}
