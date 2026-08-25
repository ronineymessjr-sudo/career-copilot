import Link from "next/link";
import { ArrowRight, CheckCircle2, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { PUBLIC_RELEASE_NOTES, PUBLIC_WORKFLOW_STEPS } from "@/lib/release-notes.mjs";

export function ReleaseNotesPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Career Copilot",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Evidence-driven AI internship job matching, resume tailoring, and approval-first application preparation.",
    featureList: ["JD analysis", "evidence-based resume tailoring", "human approval before submission"],
  };

  return <main className="release-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/>
    <header className="release-nav">
      <Link href="/playground" className="release-brand"><span><Sparkles size={16}/></span><div><strong>Career Copilot</strong><small>AI Career Intelligence Agent Platform</small></div></Link>
      <nav><Link href="/playground">公开体验</Link><Link href="/login" className="release-nav-cta">进入控制台 <ArrowRight size={14}/></Link></nav>
    </header>

    <section className="release-hero">
      <div>
        <span className="eyebrow">PUBLIC RELEASE NOTES · M08.1</span>
        <h1>每次更新都能看见，<em>每个结论都有证据。</em></h1>
        <p>Career Copilot 把岗位发现、岗位匹配、项目证据、岗位定制简历和提交前复核串成一条可解释链路。这里记录公开功能变化，也提供一键实操入口。</p>
        <div className="release-actions"><Link href="/playground" className="primary-button">立即跑一个岗位 <ArrowRight size={14}/></Link><a href="#workflow" className="ghost-button">查看工作流</a></div>
      </div>
      <aside className="release-proof"><div><GitBranch size={18}/><strong>可追踪的发布方式</strong></div><p>版本、演示场景、评测和安全边界公开记录；不使用夸大的自动投递承诺。</p><div className="release-proof-list"><span><CheckCircle2 size={14}/>确定性演示数据</span><span><CheckCircle2 size={14}/>已核验项目证据</span><span><ShieldCheck size={14}/>人工确认提交</span></div></aside>
    </section>

    <section className="release-section" id="workflow"><header><span className="eyebrow">HOW IT WORKS</span><h2>四步把“看起来匹配”变成“可以复核”。</h2></header><div className="release-workflow">{PUBLIC_WORKFLOW_STEPS.map((item) => <article key={item.step}><span>{item.step}</span><strong>{item.title}</strong><p>{item.detail}</p></article>)}</div></section>

    <section className="release-section"><header><span className="eyebrow">CHANGELOG</span><h2>公开更新</h2><p>每个版本只讲清楚实际变化，不把打开页面包装成已投递。</p></header><div className="release-timeline">{PUBLIC_RELEASE_NOTES.map((release) => <article key={release.version}><div className="release-version"><strong>{release.version}</strong><small>{release.date}</small></div><div><h3>{release.title}</h3><p>{release.summary}</p><ul>{release.highlights.map((highlight) => <li key={highlight}><CheckCircle2 size={14}/>{highlight}</li>)}</ul></div></article>)}</div></section>

    <section className="release-boundary"><ShieldCheck size={20}/><div><strong>安全边界</strong><p>公开 Demo 不读取私人资料；生产工作台只使用已保存画像和已核验项目证据；外部消息、邮件发送、岗位提交、面试和 Offer 状态都需要人工确认。</p></div></section>
    <footer className="release-footer"><span>Career Copilot V2 · Evidence-driven AI internship operating system</span><Link href="/playground">回到公开体验 <ArrowRight size={14}/></Link></footer>
  </main>;
}
