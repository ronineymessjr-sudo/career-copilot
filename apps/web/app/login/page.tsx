"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
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
    if (reason === "session_expired") setNotice("登录已过期，请重新登录后继续。 ");
    if (reason === "login_required") setNotice("请先登录投递工作台。");
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

  return <main className="login-screen login-screen-focus">
    <section className="login-brand-panel">
      <div className="login-brand-lockup"><div className="brand-mark"><Sparkles size={20}/></div><strong>Career Copilot</strong></div>
      <h1>把岗位、简历和投递放在一个工作台</h1>
      <p>按匹配度整理岗位，自动选择简历，并集中管理待投递与已投递记录。</p>
      <div className="login-benefits">
        <span><CheckCircle2 size={17}/>岗位按匹配度统一排序</span>
        <span><CheckCircle2 size={17}/>材料缺口清晰提示</span>
        <span><CheckCircle2 size={17}/>投递状态集中记录</span>
      </div>
    </section>
    <form className="login-card" onSubmit={submit}>
      <div><h2>登录</h2><p>进入你的个人投递工作台。</p></div>
      <label>邮箱<input type="email" autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} required/></label>
      <label>密码<input type="password" autoComplete="current-password" value={password} onChange={(event)=>setPassword(event.target.value)} required/></label>
      {notice ? <div className="login-proof">{notice}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <button className="primary-button" type="submit" disabled={busy}>{busy ? "验证中…" : "进入工作台"}<ArrowRight size={17}/></button>
    </form>
  </main>;
}
