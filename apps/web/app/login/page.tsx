"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/jobs";
  return value;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nextPath, setNextPath] = useState("/jobs");
  const [busy, setBusy] = useState(false);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = safeNext(params.get("next"));
    setNextPath(next);
    const reason = params.get("reason");
    if (reason === "session_expired") setNotice("登录已过期，请重新登录后继续刚才的操作。");
    if (reason === "login_required") setNotice("请先登录个人投递控制台。");
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });
  }, [router, supabase]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Supabase 尚未配置，请先完成 Cloudflare 环境变量和数据库迁移。");
      return;
    }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace(nextPath);
  }

  return <main className="login-screen">
    <section className="login-brand-panel">
      <div className="brand-mark"><Sparkles size={18}/></div>
      <span className="eyebrow">Career Copilot V2 · 1.0.1</span>
      <h1>证据驱动的 AI 实习投递控制台</h1>
      <p>系统负责核验、材料和记录；招聘平台的最终提交仍由你本人确认。</p>
      <div className="login-proof"><ShieldCheck size={18}/><span>Supabase Auth + RLS · 失效会话不会进入控制台</span></div>
    </section>
    <form className="login-card" onSubmit={submit}>
      <div><span className="eyebrow">Private workspace</span><h2>登录个人控制台</h2><p>登录后会返回刚才的岗位或投递页面。</p></div>
      <label>邮箱<input type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} required/></label>
      <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} required/></label>
      {notice ? <div className="login-proof">{notice}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "验证中…" : "进入控制台"}<ArrowRight size={15}/></button>
    </form>
  </main>;
}
