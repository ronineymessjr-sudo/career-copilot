import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "隐私与数据边界 | Career Copilot",
  description: "Career Copilot 公开 Demo、登录控制台和外部投递动作的数据边界。",
  alternates: { canonical: "https://career-copilot-v2.photomagic.workers.dev/privacy" },
};

const boundaries = [
  ["公开 Demo", "无需登录即可运行。只使用当前输入的岗位文本和公开示例项目证据，不读取私人 Career Vault，不会发送邮件或提交岗位。"],
  ["登录控制台", "登录后，岗位、画像、简历、项目证据和投递记录按当前 Supabase Auth 账号隔离。简历文件保存在受保护的私有存储中。"],
  ["人工确认", "系统可以准备材料、生成解释和排队建议，但外部消息、邮件、岗位提交、面试与 Offer 状态都不会在没有人工确认的情况下执行。"],
  ["数据请求", "如需导出、更正或删除账号数据，请登录后通过反馈中心提交请求，或在仓库 Issues 中留下不含敏感信息的说明。"],
];

export default function PrivacyPage() {
  return <main className="release-page">
    <header className="release-nav">
      <Link href="/playground" className="release-brand"><span><Sparkles size={16}/></span><div><strong>Career Copilot</strong><small>AI Career Intelligence Agent Platform</small></div></Link>
      <nav><Link href="/playground">公开体验</Link><Link href="/login" className="release-nav-cta">进入控制台 <ArrowRight size={14}/></Link></nav>
    </header>

    <section className="release-hero">
      <div>
        <span className="eyebrow">PRIVACY & DATA BOUNDARIES</span>
        <h1>先讲清楚数据边界，<em>再让 Agent 帮你做事。</em></h1>
        <p>Career Copilot 将公开演示、个人工作台和外部投递动作分开。你可以先验证系统如何分析岗位，再决定是否登录和使用自己的资料。</p>
        <div className="release-actions"><Link href="/playground" className="primary-button">运行公开 Demo <ArrowRight size={14}/></Link><Link href="/login" className="ghost-button">登录控制台</Link></div>
      </div>
      <aside className="release-proof"><div><ShieldCheck size={18}/><strong>默认安全边界</strong></div><p>没有私人证据就不生成个人化事实；没有人工确认就不执行外部写操作。</p><div className="release-proof-list"><span><CheckCircle2 size={14}/>公开 Demo 不读私人资料</span><span><CheckCircle2 size={14}/>账号数据按用户隔离</span><span><CheckCircle2 size={14}/>外部提交需要确认</span></div></aside>
    </section>

    <section className="release-section"><header><span className="eyebrow">WHAT HAPPENS TO DATA</span><h2>四个边界，覆盖一次完整使用。</h2><p>以下说明对应当前线上功能，不把演示数据包装成真实投递结果。</p></header><div className="release-workflow">{boundaries.map(([title, detail], index) => <article key={title}><span>0{index + 1}</span><strong>{title}</strong><p>{detail}</p></article>)}</div></section>

    <section className="release-boundary"><ShieldCheck size={20}/><div><strong>请勿粘贴敏感信息</strong><p>公开 Demo 不需要身份证号、银行卡、密码或招聘平台登录信息。涉及账号数据的操作请使用登录后的控制台，并在提交前检查生成材料。</p></div></section>
    <footer className="release-footer"><span>Career Copilot V2 · 隐私与数据边界</span><Link href="/updates">查看更新日志 <ArrowRight size={14}/></Link></footer>
  </main>;
}
