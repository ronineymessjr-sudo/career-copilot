"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, Sparkles, UserPlus } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

const SLOGANS = ["导入岗位 · 匹配画像 · 生成材料", "求职一条龙，AI 全流程辅助", "从发现到投递，一个工作台"];

function useTypewriter(texts: string[]) {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = texts[index % texts.length];
    const speed = deleting ? 35 : 90;
    const timer = setTimeout(() => {
      if (!deleting) {
        if (count < current.length) { setCount((c) => c + 1); return; }
        setDeleting(true); return;
      }
      if (count > 0) { setCount((c) => c - 1); return; }
      setDeleting(false);
      setIndex((i) => (i + 1) % texts.length);
    }, deleting && count === 0 ? 400 : speed);
    return () => clearTimeout(timer);
  }, [count, deleting, index, texts]);
  return texts[index % texts.length].slice(0, count);
}

type Mode = "login" | "register" | "reset" | "update_password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [busy, setBusy] = useState(false);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = safeNext(params.get("next"));
    const recoveryRequested = params.get("mode") === "update-password" || window.location.hash.includes("type=recovery");
    setNextPath(next);
    if (recoveryRequested) setMode("update_password");
    const reason = params.get("reason");
    if (reason === "session_expired") setNotice("登录已过期，请重新登录后继续。");
    if (reason === "login_required") setNotice("请先登录 Career Copilot。");
    if (!supabase) return;

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update_password");
        setNotice("身份验证成功，请设置新密码。");
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recoveryRequested) router.replace(next);
    });
    return () => listener.subscription.unsubscribe();
  }, [router, supabase]);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!supabase) { setError("Supabase 尚未配置，请先完成 Cloudflare 环境变量和数据库迁移。"); return; }
    const normalizedEmail = email.trim();
    if (mode !== "update_password" && !normalizedEmail) { setError("请输入邮箱"); return; }
    setBusy(true);
    try {
      if (mode === "reset") {
        const redirectTo = `${window.location.origin}/login?mode=update-password`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
        if (resetError) throw resetError;
        setNotice("密码重置邮件已发送，请打开邮箱继续。若没有收到，请检查垃圾邮件。");
        setMode("login");
        return;
      }
      if (password.length < 8) throw new Error("密码至少需要 8 位");
      if (mode === "update_password") {
        if (password !== confirmPassword) throw new Error("两次输入的新密码不一致");
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setNotice("密码已更新，正在进入工作台。");
        router.replace(nextPath);
        return;
      }
      if (mode === "register") {
        if (password !== confirmPassword) throw new Error("两次输入的密码不一致");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}${nextPath}` },
        });
        if (signUpError) throw signUpError;
        if (data.session) { router.replace(nextPath); return; }
        setNotice("账号已创建。请打开验证邮件，完成验证后登录。");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) throw signInError;
      router.replace(nextPath);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败");
    } finally { setBusy(false); }
  }

  const title = mode === "register" ? "创建账号" : mode === "reset" ? "找回密码" : mode === "update_password" ? "设置新密码" : "登录";
  const copy = mode === "register"
    ? "每个账号拥有独立画像、简历、推荐和投递记录。"
    : mode === "reset"
      ? "输入注册邮箱，我们会发送密码重置邮件。"
      : mode === "update_password"
        ? "输入并确认新密码，保存后即可返回工作台。"
        : "进入你的个人招聘聚合与投递工作台。";

  return <main className="login-screen login-screen-focus">
    <div className="login-aurora" aria-hidden="true"><i/><i/><i/></div>
    <div className="login-float" aria-hidden="true"><span/><span/><span/><span/><span/></div>
    <section className="login-brand-panel">
      <div className="login-brand-lockup"><div className="brand-mark brand-mark-hero"><Sparkles size={22}/></div><strong>Career Copilot</strong><em>AI 求职助手</em></div>
      <h1>每天推荐岗位，自动匹配简历并准备投递</h1>
      <p className="login-slogan">{useTypewriter(SLOGANS)}<span className="login-caret"/></p>
      <div className="login-benefits">
        <span><CheckCircle2 size={17}/>每天为每个用户独立生成推荐</span>
        <span><CheckCircle2 size={17}/>自动选择最匹配的简历版本</span>
        <span><CheckCircle2 size={17}/>材料缺口与最终投递状态集中管理</span>
      </div>
    </section>
    <form className="login-card" onSubmit={submit}>
      <div><h2>{title}</h2><p>{copy}</p></div>
      {mode !== "update_password" ? <label>邮箱<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label> : null}
      {mode !== "reset" ? <label>{mode === "update_password" ? "新密码" : "密码"}<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} required/></label> : null}
      {mode === "register" || mode === "update_password" ? <label>确认密码<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required/></label> : null}
      {notice ? <div className="login-proof">{notice}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <button className="primary-button" type="submit" disabled={busy}>
        {mode === "register" ? <UserPlus size={17}/> : mode === "reset" || mode === "update_password" ? <KeyRound size={17}/> : null}
        {busy ? "处理中…" : mode === "register" ? "创建账号" : mode === "reset" ? "发送重置邮件" : mode === "update_password" ? "保存新密码" : "进入工作台"}
        {mode === "login" ? <ArrowRight size={17}/> : null}
      </button>
      {mode !== "update_password" ? <div className="login-mode-switch">
        <button type="button" aria-pressed={mode === "login"} onClick={() => switchMode("login")}>登录</button>
        <button type="button" aria-pressed={mode === "register"} onClick={() => switchMode("register")}>注册</button>
        <button type="button" aria-pressed={mode === "reset"} onClick={() => switchMode("reset")}>找回密码</button>
      </div> : null}
      {mode !== "update_password" ? <div className="login-demo-handoff">
        <span>想先了解系统？</span>
        <Link href="/playground">体验公开 Demo <ArrowRight size={14}/></Link>
        <small>无需登录，不读取私人资料，也不会自动投递。</small>
      </div> : null}
    </form>
  </main>;
}
