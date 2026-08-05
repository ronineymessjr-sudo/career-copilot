"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Send, Sparkles } from "lucide-react";

const nav = [
  ["/jobs", "选岗位", BriefcaseBusiness],
  ["/applications", "待投递", Send],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="focus-frame">
    <header className="focus-header">
      <Link href="/jobs" className="focus-brand" aria-label="Career Copilot 岗位页">
        <span className="focus-brand-mark"><Sparkles size={14}/></span>
        <strong>Career Copilot</strong>
      </Link>
      <nav className="focus-nav" aria-label="主要导航">
        {nav.map(([href, label, Icon]) => <Link key={href} href={href} className={pathname === href ? "focus-nav-item active" : "focus-nav-item"}>
          <Icon size={13}/><span>{label}</span>
        </Link>)}
      </nav>
      <span className="focus-flow">选择 → 匹配 → 投递</span>
    </header>
    <main className="focus-main">{children}</main>
  </div>;
}
