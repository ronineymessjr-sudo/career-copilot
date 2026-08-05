"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, BriefcaseBusiness, CheckCircle2, FileText, RefreshCw, Save } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type Profile = {
  graduation_year: number;
  major: string;
  degree: string;
  availability_days: number;
  availability_months: number;
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

type ProfileResponse = { profile: Profile; completeness: { score: number; missing: string[] } };

function csv(value: string): string[] {
  return value.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
}

export function ProfileWorkspace() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completeness, setCompleteness] = useState({ score: 0, missing: [] as string[] });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await controlFetch<ProfileResponse>("/api/control/profile");
      setProfile(result.profile);
      setCompleteness(result.completeness);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载画像失败");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => profile ? [
    `${profile.graduation_year} 届 ${profile.degree}`,
    profile.major,
    `每周 ${profile.availability_days} 天 · 可持续 ${profile.availability_months} 个月`,
  ].filter(Boolean).join(" · ") : "", [profile]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      const result = await controlFetch<ProfileResponse>("/api/control/profile", { method: "PATCH", body: JSON.stringify(profile) });
      setProfile(result.profile);
      setCompleteness(result.completeness);
      setMessage("画像已保存，岗位池会立即按新的目标重新排序。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "画像保存失败");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <section className="platform-workspace"><div className="platform-loading"><RefreshCw size={18}/>正在加载画像…</div></section>;

  return <section className="platform-workspace">
    <header className="platform-page-head">
      <div><h1>我的求职画像</h1><p>画像决定岗位排序、资格判断、简历匹配和缺口提醒。每个账号独立保存，互不影响。</p></div>
      <div className="platform-profile-score"><strong>{completeness.score}%</strong><span>画像完整度</span></div>
    </header>

    {message ? <div className="platform-message" role="status">{message}</div> : null}

    <div className="platform-profile-summary"><CheckCircle2 size={18}/><div><strong>{summary}</strong><span>{completeness.missing.length ? `还可补充：${completeness.missing.join("、")}` : "画像信息已足够用于完整推荐"}</span></div></div>

    <form className="platform-profile-form" onSubmit={save}>
      <section className="platform-form-section">
        <header><h2>基本条件</h2><p>用于判断届别、出勤和周期是否满足岗位要求。</p></header>
        <div className="platform-form-grid four">
          <label>毕业年份<input type="number" min="2024" max="2040" value={profile.graduation_year} onChange={(event) => setProfile({ ...profile, graduation_year: Number(event.target.value) })}/></label>
          <label>专业<input value={profile.major} onChange={(event) => setProfile({ ...profile, major: event.target.value })}/></label>
          <label>学历<input value={profile.degree} onChange={(event) => setProfile({ ...profile, degree: event.target.value })}/></label>
          <label>每周可实习天数<input type="number" min="1" max="7" value={profile.availability_days} onChange={(event) => setProfile({ ...profile, availability_days: Number(event.target.value) })}/></label>
          <label>可持续月数<input type="number" min="1" max="36" value={profile.availability_months} onChange={(event) => setProfile({ ...profile, availability_months: Number(event.target.value) })}/></label>
        </div>
      </section>

      <section className="platform-form-section">
        <header><h2>推荐偏好</h2><p>系统不会因此隐藏整个岗位池，只会改变推荐顺序和解释。</p></header>
        <div className="platform-form-grid two">
          <label>目标岗位<textarea rows={3} value={profile.preferences.target_roles.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, target_roles: csv(event.target.value) } })} placeholder="AI Agent，后端开发，AI 产品"/></label>
          <label>目标地点<textarea rows={3} value={profile.preferences.locations.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, locations: csv(event.target.value) } })} placeholder="上海，南京，远程"/></label>
          <label>技能关键词<textarea rows={3} value={profile.preferences.keywords.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, keywords: csv(event.target.value) } })} placeholder="Python，RAG，React"/></label>
          <label>排除关键词<textarea rows={3} value={profile.preferences.excluded_keywords.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, excluded_keywords: csv(event.target.value) } })} placeholder="销售，纯线下（可留空）"/></label>
          <label>偏好行业<input value={profile.preferences.industries.join("，")} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, industries: csv(event.target.value) } })} placeholder="人工智能，SaaS，医疗科技"/></label>
          <fieldset className="platform-work-modes"><legend>办公方式</legend>{[["remote", "远程"], ["hybrid", "混合"], ["onsite", "现场"]].map(([value, label]) => <label key={value}><input type="checkbox" checked={profile.preferences.work_modes.includes(value)} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, work_modes: event.target.checked ? [...new Set([...profile.preferences.work_modes, value])] : profile.preferences.work_modes.filter((item) => item !== value) } })}/>{label}</label>)}</fieldset>
          <label className="platform-checkbox"><input type="checkbox" checked={profile.preferences.internship_only} onChange={(event) => setProfile({ ...profile, preferences: { ...profile.preferences, internship_only: event.target.checked } })}/>只把实习岗位视为可投；关闭后也推荐校招和全职岗位</label>
        </div>
      </section>

      <div className="platform-form-actions"><button className="primary-button" type="submit" disabled={busy}><Save size={16}/>{busy ? "保存中…" : "保存并重新推荐"}</button></div>
    </form>

    <section className="platform-resource-links">
      <Link href="/jobs"><BriefcaseBusiness size={17}/><span><strong>查看完整岗位池</strong><small>所有岗位都可浏览，推荐岗位排在前面</small></span></Link>
      <Link href="/resumes"><FileText size={17}/><span><strong>管理简历版本</strong><small>不同岗位自动匹配不同版本</small></span></Link>
      <Link href="/career-vault"><BookOpenCheck size={17}/><span><strong>补项目证据</strong><small>真实项目证据会提高匹配和材料质量</small></span></Link>
    </section>
  </section>;
}
