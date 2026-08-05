import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProfile, personalizeJob, profileCompleteness } from "../lib/recommendation-profile.mjs";

test("profile normalization gives each account independent recommendation defaults", () => {
  const profile = normalizeProfile({ graduation_year: 2027, major: "软件工程", availability_days: 5, availability_months: 6, preferences: { target_roles: ["前端开发"], locations: ["北京"], work_modes: ["hybrid"], keywords: ["React"] } });
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
});
