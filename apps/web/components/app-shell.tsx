"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, BriefcaseBusiness, ChevronDown, FileText, FileSearch, Home, LogOut, Menu, MessageSquare, Radar, Send, Settings, UserRound, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { FeedbackWidget } from "@/components/feedback-widget";
import { WorkspaceBrand } from "@/components/workspace-ui";

const primaryNav = [
  ["/", "今日简报", Home],
  ["/jobs", "岗位发现", BriefcaseBusiness],
  ["/jd", "JD 深拆", FileSearch],
  ["/applications", "投递管理", Send],
] as const;

const resourceNav = [
  ["/profile", "我的画像", UserRound],
  ["/resumes", "简历版本", FileText],
  ["/career-vault", "项目证据", BookOpenCheck],
  ["/sources", "岗位来源", Radar],
  ["/analytics", "数据看板", BarChart3],
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
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeResource = resourceNav.some(([href]) => isActive(pathname, href));
  useEffect(() => { const supabase = getSupabaseBrowser(); if (!supabase) return; void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);
  useEffect(() => { if (activeResource) setResourcesOpen(true); }, [activeResource]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  async function signOut() { const supabase = getSupabaseBrowser(); await supabase?.auth.signOut(); router.replace("/login"); }
  return <div className="platform-frame">
    <a href="#workspace-content" className="cc-skip">跳到主要内容</a>
    <aside className="platform-sidebar">
      <WorkspaceBrand/>
      <nav className="platform-nav" aria-label="核心工作区">
        <span className="platform-nav-label">工作台</span>
        {primaryNav.map(([href, label, Icon]) => <Link key={href} href={href} aria-label={href === "/jobs" ? "岗位发现，完整岗位池" : undefined} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/><span>{label}</span></Link>)}
        <details className="platform-nav-fold" open={resourcesOpen} onToggle={(event) => setResourcesOpen(event.currentTarget.open)}>
          <summary className="platform-nav-label resources"><span>资料与工具</span><ChevronDown size={14}/></summary>
          <div>{resourceNav.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/><span>{label}</span></Link>)}</div>
        </details>
      </nav>
      <div className="platform-sidebar-account"><span><UserRound size={16}/><small>{email || "当前账号"}</small></span><button type="button" onClick={() => void signOut()}><LogOut size={15}/>退出登录</button></div>
    </aside>
    <div className="platform-content">
      <header className="cc-mobile-nav" onKeyDown={(event) => { if (event.key === "Escape") { setMobileOpen(false); document.getElementById("workspace-menu-toggle")?.focus(); } }}>
        <div><WorkspaceBrand/><button id="workspace-menu-toggle" type="button" className="cc-button" aria-expanded={mobileOpen} aria-controls="workspace-mobile-links" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={18}/> : <Menu size={18}/>}<span>{mobileOpen ? "收起" : "菜单"}</span></button></div>
        <nav id="workspace-mobile-links" aria-label="移动端工作区" hidden={!mobileOpen}>
          {primaryNav.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-label={href === "/jobs" ? "岗位发现，完整岗位池" : undefined} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/>{label}</Link>)}
          <small>资料与工具</small>
          {resourceNav.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/>{label}</Link>)}
          <button className="cc-button" type="button" onClick={() => void signOut()}><LogOut size={16}/>退出登录</button>
        </nav>
      </header>
      <main id="workspace-content" className="platform-main">{children}</main>
    </div>
    <FeedbackWidget />
  </div>;
}
