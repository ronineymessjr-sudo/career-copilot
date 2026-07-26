"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "unconfigured">("checking");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState("unconfigured");
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (!data.session) router.replace("/login");
      else setState("ready");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
      else setState("ready");
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (state === "ready") return <>{children}</>;
  if (state === "unconfigured") {
    return <section className="auth-state-card">
      <ShieldCheck size={24}/>
      <div>
        <span className="eyebrow">Configuration required</span>
        <h2>Supabase 尚未连接</h2>
        <p>当前站点只能展示演示内容。配置公开 URL、Publishable Key 并执行 0001–0008 迁移后，岗位控制台才会开放。</p>
        <Link className="ghost-button" href="/settings">查看部署设置</Link>
      </div>
    </section>;
  }
  return <section className="auth-state-card"><div className="loading-dot"/><div><h2>正在验证登录状态</h2><p>不会把登录令牌写入页面或公开日志。</p></div></section>;
}
