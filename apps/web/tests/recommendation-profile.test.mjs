import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProfile, personalizeJob, profileCompleteness } from "../lib/recommendation-profile.mjs";

test("profile normalization gives each account independent recommendation defaults", () => {
  const profile = normalizeProfile({
    graduation_year: 2027,
    major: "软件工程",
    degree: "本科",
    availability_days: 5,
    availability_months: 6,
    profile_details: {
      display_name: "测试用户",
      headline: "前端开发工程师",
      summary: "专注于 React 和 TypeScript 的前端开发，具备完整项目交付与协作经验。",
      skills: ["React", "TypeScript", "Next.js"],
      education: [{ title: "软件工程", organization: "示例大学", period: "2023-2027", description: "本科" }],
      projects: [{ title: "数据工作台", organization: "个人项目", period: "2026", description: "使用 React 构建" }],
    },
    preferences: { target_roles: ["前端开发"], locations: ["北京"], work_modes: ["hybrid"], keywords: ["React"] },
  });
  assert.equal(profile.graduation_year, 2027);
  assert.deepEqual(profile.preferences.target_roles, ["前端开发"]);
  assert.ok(profileCompleteness(profile).score >= 80);
});

test("personalized recommendation changes with user target and location", () => {
  const job = { title: "AI Agent 后端实习生", description: "Python FastAPI RAG", city: "上海", workplace: "hybrid", published_at: "2026-08-01", company_name: "Example" };
  const evaluation = { total_score: 76, eligible: true, needs_confirmation: false, matched_skills: ["python", "fastapi"], missing_skills: [] };
  const matching = personalizeJob(job, evaluation, { preferences: { target_roles: ["AI Agent"], locations: ["上海"], work_modes: ["hybrid"], keywords: ["Python", "RAG"] } }, new Date("2026-08-05T00:00:00Z"));
  const unrelated = personalizeJob(job, evaluation, { preferences: { target_roles: ["平面设计"], locations: ["北京"], work_modes: ["onsite"], keywords: ["Photoshop"] } }, new Date("2026-08-05T00:00:00Z"));
  assert.ok(matching.score > unrelated.score);
  assert.ok(matching.reasons.some((item) => item.includes("目标方向")));
});


test("new accounts start with a neutral profile instead of a fixed AI internship persona", () => {
  const profile = normalizeProfile({});
  assert.deepEqual(profile.preferences.target_roles, []);
  assert.deepEqual(profile.preferences.locations, []);
  assert.equal(profile.preferences.internship_only, false);
  assert.equal(profile.major, "");
  assert.equal(profile.degree, "");
  assert.equal(profile.graduation_year, null);
  assert.equal(profile.preferences.salary_min, null);
  assert.equal(profile.preferences.salary_period, "any");
  assert.equal(profile.preferences.salary_match_mode, "overlap");
  assert.equal(profile.preferences.company_founded_from, null);
});
