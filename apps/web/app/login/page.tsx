"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [magicLinkMessage, setMagicLinkMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/jobs");
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/jobs");
  }

  async function sendMagicLink() {
    setError("");
    setMagicLinkMessage("");
    if (!supabase) {
      setError("Supabase 尚未配置");
      return;
    }
    if (!email.trim()) {
      setError("请先填写邮箱");
      return;
    }
    setBusy(true);
    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/jobs` },
    });
    setBusy(false);
    if (magicLinkError) {
      setError(magicLinkError.message);
      return;
    }
    setMagicLinkMessage("登录链接已发送，请在邮箱中打开链接后返回控制台。");
  }

  return <main className="login-screen">
    <section className="login-brand-panel">
      <div className="brand-mark"><Sparkles size={18}/></div>
      <span className="eyebrow">Career Copilot V2 · 0.7.0</span>
      <h1>证据驱动的 AI 实习投递控制台</h1>
      <p>岗位必须先通过 2028 届、在校资格、出勤周期和真实性核验。材料批准后只进入待提交，最终提交仍由你确认。</p>
      <div className="login-proof"><ShieldCheck size={18}/><span>Supabase Auth + RLS · 用户数据相互隔离</span></div>
    </section>
    <form className="login-card" onSubmit={submit}>
      <div><span className="eyebrow">Private workspace</span><h2>登录个人控制台</h2><p>使用你在 Supabase Auth 中创建的账号。</p></div>
      <label>邮箱<input type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} required/></label>
      <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} required/></label>
      {error ? <div className="form-error">{error}</div> : null}
      {magicLinkMessage ? <div className="login-proof">{magicLinkMessage}</div> : null}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "登录中…" : "进入控制台"}<ArrowRight size={15}/></button>
      <button className="ghost-button" type="button" disabled={busy} onClick={sendMagicLink}>发送无密码登录链接</button>
    </form>
  </main>;
}
