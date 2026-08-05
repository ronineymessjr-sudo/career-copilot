import test from "node:test";
import assert from "node:assert/strict";
import { buildApplicationContentBundle, buildMailtoUrl, detectSubmissionCapability } from "../lib/application-kit.mjs";

const profile = {
  graduation_year: 2028,
  major: "软件工程",
  degree: "本科",
  availability_days: 4,
  availability_months: 5,
  profile_details: {
    display_name: "张同学",
    headline: "后端与 AI 应用开发",
    summary: "使用 Python 开发过 Web 与 AI 应用。",
    phone: "13800000000",
    current_city: "上海",
    skills: ["Python", "FastAPI", "SQL"],
    projects: [{ title: "课程项目", description: "使用 FastAPI 与 SQL 完成接口和数据管理。" }],
  },
};

const resume = {
  id: "resume-1",
  name: "后端开发版",
  status: "approved",
  content: { skills: ["Python", "FastAPI", "SQL"], summary: "后端开发方向学生" },
};

const evaluation = { matched_skills: ["Python", "FastAPI"], total_score: 86 };

test("detects email compose handoff when recruiter email is available", () => {
  const capability = detectSubmissionCapability({ channel: "email", recruiter_email: "hr@example.com" });
  assert.equal(capability.mode, "email_compose");
  assert.equal(capability.supported_action, true);
  assert.equal(capability.server_side_submission, false);
});

test("detects real-link handoff for public application pages", () => {
  const capability = detectSubmissionCapability({ channel: "greenhouse", source_url: "https://boards.greenhouse.io/example/jobs/1" });
  assert.equal(capability.mode, "link_handoff");
  assert.equal(capability.target_url, "https://boards.greenhouse.io/example/jobs/1");
});

test("generates a complete truthful application bundle from saved data", () => {
  const bundle = buildApplicationContentBundle({
    job: { id: "job-1", company_name: "Example", title: "Python 实习生", source_url: "https://example.com/jobs/1", requirements: "需要 Python 与 FastAPI" },
    evaluation,
    profile,
    resume,
    evidence: [],
    accountEmail: "candidate@example.com",
  });
  assert.match(bundle.greeting, /Python 实习生/);
  assert.match(bundle.cover_letter, /Example/);
  assert.equal(bundle.tailored_resume.candidate.email, "candidate@example.com");
  assert.deepEqual(bundle.tailored_resume.skills, ["Python", "FastAPI"]);
  assert.equal(bundle.tailored_resume.skills.includes("Kubernetes"), false);
  assert.ok(bundle.common_answers.length >= 5);
  assert.equal(bundle.submission_capability.mode, "link_handoff");
  assert.equal(bundle.truth_contract.no_invented_metrics, true);
});

test("builds a prefilled mailto URL", () => {
  const url = buildMailtoUrl({ to: "hr@example.com", subject: "Apply", body: "Hello" });
  assert.match(url, /^mailto:hr@example\.com\?/);
  assert.match(url, /subject=Apply/);
  assert.match(url, /body=Hello/);
  assert.equal(buildMailtoUrl({ to: "not-an-email", subject: "x", body: "y" }), null);
});
