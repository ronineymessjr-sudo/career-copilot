"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BookOpenCheck, ChevronDown, FileText, FileSearch, Home, LogOut, Menu, MessageSquare, Radar, Search, Send, Settings, UserRound, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { FeedbackWidget } from "@/components/feedback-widget";
import { WorkspaceBrand } from "@/components/workspace-ui";
import { LanguageToggle, useLocale } from "@/components/locale-provider";

const primaryNav = [
  ["/dashboard", "brief", Home],
  ["/jobs", "jobs", Search],
  ["/jd", "jd", FileSearch],
  ["/applications", "applications", Send],
] as const;

const resourceNav = [
  ["/profile", "profile", UserRound],
  ["/resumes", "resumes", FileText],
  ["/career-vault", "vault", BookOpenCheck],
  ["/sources", "sources", Radar],
  ["/analytics", "analytics", BarChart3],
  ["/settings", "settings", Settings],
  ["/feedback", "feedback", MessageSquare],
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeResource = resourceNav.some(([href]) => isActive(pathname, href));
  useEffect(() => { const supabase = getSupabaseBrowser(); if (!supabase) return; void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "")); }, []);
  useEffect(() => { if (activeResource) setResourcesOpen(true); }, [activeResource]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  async function signOut() { const supabase = getSupabaseBrowser(); await supabase?.auth.signOut(); router.replace("/playground"); }
  return <div className="platform-frame">
    <a href="#workspace-content" className="cc-skip">{t("skipToMain")}</a>
    <aside className="platform-sidebar">
      <WorkspaceBrand href="/dashboard"/>
      <div className="platform-sidebar-locale"><LanguageToggle/></div>
      <nav className="platform-nav" aria-label="核心工作区">
        <span className="platform-nav-label">{t("workspace")}</span>
        {primaryNav.map(([href, labelKey, Icon]) => <Link key={href} href={href} aria-label={href === "/jobs" ? `${t("jobs")}, ${t("workspace")}` : undefined} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/><span>{t(labelKey)}</span></Link>)}
        <details className="platform-nav-fold" open={resourcesOpen} onToggle={(event) => setResourcesOpen(event.currentTarget.open)}>
          <summary className="platform-nav-label resources"><span>{t("resources")}</span><ChevronDown size={14}/></summary>
          <div>{resourceNav.map(([href, labelKey, Icon]) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/><span>{t(labelKey)}</span></Link>)}</div>
        </details>
      </nav>
      <div className="platform-sidebar-account"><span><UserRound size={16}/><small>{email || t("currentAccount")}</small></span><button type="button" onClick={() => void signOut()}><LogOut size={15}/>{t("signOut")}</button></div>
    </aside>
    <div className="platform-content">
      <header className="cc-mobile-nav" onKeyDown={(event) => { if (event.key === "Escape") { setMobileOpen(false); document.getElementById("workspace-menu-toggle")?.focus(); } }}>
        <div><WorkspaceBrand href="/dashboard"/><span className="cc-mobile-nav-actions"><LanguageToggle compact/><button id="workspace-menu-toggle" type="button" className="cc-button" aria-expanded={mobileOpen} aria-controls="workspace-mobile-links" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={18}/> : <Menu size={18}/>}<span>{mobileOpen ? t("close") : t("menu")}</span></button></span></div>
        <nav id="workspace-mobile-links" aria-label="移动端工作区" hidden={!mobileOpen}>
          {primaryNav.map(([href, labelKey, Icon]) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-label={href === "/jobs" ? `${t("jobs")}, ${t("workspace")}` : undefined} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/>{t(labelKey)}</Link>)}
          <small>{t("resources")}</small>
          {resourceNav.map(([href, labelKey, Icon]) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? "platform-nav-item active" : "platform-nav-item"}><Icon size={17}/>{t(labelKey)}</Link>)}
          <button className="cc-button" type="button" onClick={() => void signOut()}><LogOut size={16}/>{t("signOut")}</button>
        </nav>
      </header>
      <main id="workspace-content" className="platform-main">{children}</main>
    </div>
    <FeedbackWidget />
  </div>;
}
