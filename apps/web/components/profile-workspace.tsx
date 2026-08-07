"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, BriefcaseBusiness, CheckCircle2, CircleAlert, FileText, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type ProfileRecord = { title: string; organization: string; period: string; description: string };
type Profile = {
  graduation_year: number | null;
  major: string;
  degree: string;
  availability_days: number;
  availability_months: number;
  details: {
    display_name: string;
    phone: string;
    current_city: string;
    headline: string;
    summary: string;
    years_experience: number;
    skills: string[];
    experience: ProfileRecord[];
    education: ProfileRecord[];
    projects: ProfileRecord[];
    languages: string[];
    certifications: string[];
    links: string[];
  };
  preferences: {
    target_roles: string[];
    locations: string[];
    work_modes: string[];
    industries: string[];
    keywords: string[];
    excluded_keywords: string[];
    internship_only: boolean;
  };
};

type ProfileResponse = { profile: Profile; completeness: { score: number; missing: string[] }; account?: { email?: string | null } };

function csv(value: string): string[] {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

function blankRecord(): ProfileRecord {
  return { title: "", organization: "", period: "", description: "" };
}

function RecordsEditor({ title, hint, items, onChange }: { title: string; hint: string; items: ProfileRecord[]; onChange: (items: ProfileRecord[]) => void }) {
  function update(index: number, patch: Partial<ProfileRecord>) {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }
  return <section className="profile-records-block">
    <header><div><h3>{title}</h3><p>{hint}</p></div><button type="button" className="ghost-button compact" onClick={() => onChange([...items, blankRecord()])}><Plus size={14}/>新增</button></header>
    {items.length === 0 ? <button type="button" className="profile-add-empty" onClick={() => onChange([blankRecord()])}><Plus size={15}/>添加第一条{title}</button> : items.map((item, index) => <article className="profile-record-row" key={`${title}-${index}`}>
      <div className="profile-record-grid">
        <label>名称<input value={item.title} onChange={(event) => update(index, { title: event.target.value })} placeholder={title === "教育经历" ? "专业或学位" : title === "项目经历" ? "项目名称" : "职位或角色"}/></label>
        <label>机构<input value={item.organization} onChange={(event) => update(index, { organization: event.target.value })} placeholder={title === "教育经历" ? "学校" : "公司或团队"}/></label>
        <label>时间<input value={item.period} onChange={(event) => update(index, { period: event.target.value })} placeholder="2024.03–2025.01"/></label>
      </div>
      <label>说明<textarea rows={3} value={item.description} onChange={(event) => update(index, { description: event.target.value })} placeholder="写清楚职责、使用的方法和可以验证的结果。"/></label>
      <button type="button" className="icon-button danger" aria-label={`删除${title}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15}/></button>
    </article>)}
  </section>;
}

export function ProfileWorkspace() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [completeness, setCompleteness] = useState({ score: 0, missing: [] as string[] });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<ProfileResponse>("/api/control/profile");
      setProfile(result.profile);
      setCompleteness(result.completeness);
      setEmail(result.account?.email ?? "");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载画像失败");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => profile ? [
    profile.details.display_name || email,
    profile.details.headline,
    profile.graduation_year ? `${profile.graduation_year} 届 ${profile.degree}` : profile.degree,
    profile.major,
    `每周 ${profile.availability_days} 天 · 可持续 ${profile.availability_months} 个月`,
  ].filter(Boolean).join(" · ") : "", [email, profile]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      const result = await controlFetch<ProfileResponse>("/api/control/profile", { method: "PATCH", body: JSON.stringify(profile) });
      setProfile(result.profile);
      setCompleteness(result.completeness);
      setMessage("完整画像已保存。每日推荐、岗位资格判断和简历匹配会从下一次刷新起使用这些信息。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像保存失败");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <section className="platform-workspace"><div className="platform-loading"><RefreshCw size={18}/>正在加载画像…</div></section>;

  return <section className="platform-workspace">
    <header className="platform-page-head">
      <div><h1>我的完整画像</h1><p>一次填写，保存为当前账号的长期画像。它同时服务于每日推荐、简历版本选择、材料缺口判断和投递准备。</p></div>
      <div className="platform-profile-score"><strong>{completeness.score}%</strong><span>画像完整度</span></div>
    </header>

    {message ? <div className="platform-message" role="status">{message}</div> : null}

    <div className="platform-profile-summary"><CheckCircle2 size={18}/><div><strong>{summary || "画像尚未填写"}</strong><span>{completeness.missing.length ? `还可补充：${completeness.missing.slice(0, 6).join("、")}` : "画像信息已足够用于完整推荐"}</span></div></div>

    {completeness.missing.length ? <div className="platform-notice warn"><CircleAlert size={18}/><span><strong>下一步建议</strong><small>先填好下面这些，推荐会明显更准：{completeness.missing.slice(0, 6).join("、")}。填完点右下角「保存完整画像并重新推荐」即可。</small></span></div> : <div className="platform-notice ok"><CheckCircle2 size={18}/><span><strong>画像完整</strong><small>信息已足够用于完整推荐和投递准备。</small></span></div>}

    <form className="platform-profile-form" onSubmit={save}>
      <section className="platform-form-section">
        <header><h2>个人信息与职业定位</h2><p>这些内容构成简历主档案，不会公开给其他用户。</p></header>
        <div className="platform-form-grid two">
          <label>姓名或称呼<input value={profile.details.display_name} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, display_name: event.target.value } })} placeholder="例如 张同学"/></label>
          <label>登录邮箱<input value={email} readOnly aria-readonly="true"/></label>
          <label>手机或联系方式<input value={profile.details.phone} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, phone: event.target.value } })} placeholder="仅保存在个人画像"/></label>
          <label>当前城市<input value={profile.details.current_city} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, current_city: event.target.value } })} placeholder="上海"/></label>
          <label className="full">职业定位<input value={profile.details.headline} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, headline: event.target.value } })} placeholder="AI 应用开发 / 后端工程 / 数据产品"/></label>
          <label className="full">个人简介<textarea rows={5} value={profile.details.summary} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, summary: event.target.value } })} placeholder="用 80–200 字说明你的方向、核心能力、最有代表性的经历和当前目标。"/></label>
        </div>
      </section>

      <section className="platform-form-section">
        <header><h2>基本条件</h2><p>用于判断届别、学历、出勤和周期是否满足岗位要求。</p></header>
        <div className="platform-form-grid four">
          <label>毕业年份<input type="number" min="2024" max="2040" value={profile.graduation_year ?? ""} onChange={(event) => setProfile({ ...profile, graduation_year: event.target.value ? Number(event.target.value) : null })}/></label>
          <label>专业<input value={profile.major} onChange={(event) => setProfile({ ...profile, major: event.target.value })}/></label>
          <label>相关经验年数<input type="number" min="0" max="60" value={profile.details.years_experience} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, years_experience: Number(event.target.value) } })}/></label>
          <label>每周可投入天数<input type="number" min="1" max="7" value={profile.availability_days} onChange={(event) => setProfile({ ...profile, availability_days: Number(event.target.value) })}/></label>
          <label>可持续月数<input type="number" min="1" max="36" value={profile.availability_months} onChange={(event) => setProfile({ ...profile, availability_months: Number(event.target.value) })}/></label>
          <label className="full">第一学历<input value={profile.degree} onChange={(event) => setProfile({ ...profile, degree: event.target.value })} placeholder="例如 本科 / 硕士 / 博士"/></label>
        </div>
      </section>

      <section className="platform-form-section">
        <header><h2>能力与公开资料</h2><p>技能会参与推荐和简历匹配；链接只接受 HTTP/HTTPS 地址。</p></header>
        <div className="platform-form-grid two">
          <label>技能清单<textarea rows={4} value={profile.details.skills.join("，")} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, skills: csv(event.target.value) } })} placeholder="Python，TypeScript，FastAPI，RAG，SQL"/></label>
          <label>语言能力<textarea rows={4} value={profile.details.languages.join("，")} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, languages: csv(event.target.value) } })} placeholder="中文（母语），英语（CET-6）"/></label>
          <label>证书与奖项<textarea rows={4} value={profile.details.certifications.join("，")} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, certifications: csv(event.target.value) } })} placeholder="竞赛、证书、奖学金，可留空"/></label>
          <label>作品与个人链接<textarea rows={4} value={profile.details.links.join("\n")} onChange={(event) => setProfile({ ...profile, details: { ...profile.details, links: csv(event.target.value) } })} placeholder="https://github.com/...\nhttps://portfolio.example.com"/></label>
        </div>
      </section>

      <section className="platform-form-section profile-records-section">
        <header><h2>经历档案</h2><p>这里保存完整经历，简历库会从中生成不同版本；项目证据仍在 Career Vault 中单独核验。</p></header>
        <RecordsEditor title="教育经历" hint="学校、专业、学位和时间。" items={profile.details.education} onChange={(items) => setProfile({ ...profile, details: { ...profile.details, education: items } })}/>
        <RecordsEditor title="工作或实习经历" hint="职位、机构、时间与可验证结果。" items={profile.details.experience} onChange={(items) => setProfile({ ...profile, details: { ...profile.details, experience: items } })}/>
        <RecordsEditor title="项目经历" hint="项目名称、角色、技术方法与结果。" items={profile.details.projects} onChange={(items) => setProfile({ ...profile, details: { ...profile.details, projects: items } })}/>
      </section>

      <section className="platform-form-section">
        <header><h2>求职与推荐偏好</h2><p>系统不会因此隐藏完整岗位池，只会改变每日推荐顺序和解释。</p></header>
        <div className="platform-form-grid two">
          <label>目标岗位<textarea rows={3} value={profile.preferences.target_roles.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, target_roles: csv(event.target.value) } })} placeholder="AI 应用开发，后端开发，数据产品"/></label>
          <label>目标地点<textarea rows={3} value={profile.preferences.locations.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, locations: csv(event.target.value) } })} placeholder="上海，南京，远程"/></label>
          <label>推荐关键词<textarea rows={3} value={profile.preferences.keywords.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, keywords: csv(event.target.value) } })} placeholder="Agent，RAG，平台工程"/></label>
          <label>排除关键词<textarea rows={3} value={profile.preferences.excluded_keywords.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, excluded_keywords: csv(event.target.value) } })} placeholder="销售，纯线下（可留空）"/></label>
          <label>偏好行业<input value={profile.preferences.industries.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, industries: csv(event.target.value) } })} placeholder="人工智能，SaaS，医疗科技"/></label>
          <fieldset className="platform-work-modes"><legend>办公方式</legend>{[["remote", "远程"], ["hybrid", "混合"], ["onsite", "现场"]].map(([value, label]) => <label key={value}><input type="checkbox" checked={profile.preferences.work_modes.includes(value)} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, work_modes: event.target.checked ? [...new Set([...profile.preferences.work_modes, value])] : profile.preferences.work_modes.filter((item) => item !== value) } })}/>{label}</label>)}</fieldset>
          <label className="platform-checkbox full"><input type="checkbox" checked={profile.preferences.internship_only} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, internship_only: event.target.checked } })}/>只把实习岗位视为优先推荐；关闭后也推荐校招和全职岗位</label>
        </div>
      </section>

      <div className="platform-form-actions sticky-save"><button className="primary-button" type="submit" disabled={busy}><Save size={16}/>{busy ? "保存中…" : "保存完整画像并重新推荐"}</button></div>
    </form>

    <section className="platform-resource-links">
      <Link href="/jobs"><BriefcaseBusiness size={17}/><span><strong>查看完整岗位池</strong><small>所有岗位都可浏览，推荐岗位排在前面</small></span></Link>
      <Link href="/resumes"><FileText size={17}/><span><strong>管理多份简历</strong><small>上传原文件、建立主简历并生成岗位版本</small></span></Link>
      <Link href="/career-vault"><BookOpenCheck size={17}/><span><strong>补项目证据</strong><small>真实项目证据会提高匹配和材料质量</small></span></Link>
    </section>
  </section>;
}
