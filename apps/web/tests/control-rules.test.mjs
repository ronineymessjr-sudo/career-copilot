import test from "node:test";
import assert from "node:assert/strict";
import {
  buildApplicationPackage,
  computeReadiness,
  evaluateJob,
  jobIdentityParts,
  parseJobIntake,
  preserveVerifiedJobFields,
  validateApplicationTransition,
  validatePackageEvidence,
} from "../lib/control-rules.mjs";

test("parser keeps 2028 eligibility unknown when JD only says internship", () => {
  const job = parseJobIntake({
    raw_text: "某创业团队 AI Agent 后端实习生\n每周3天，至少3个月，可远程，200-300元/天\nPython FastAPI LangGraph RAG",
    company: "某创业团队",
    title: "AI Agent 后端实习生",
  });
  assert.equal(job.accepts_2028, null);
  assert.equal(job.days_per_week, 3);
  assert.equal(job.minimum_months, 3);
  assert.equal(job.workplace, "remote");
});

test("explicit 2028 and verified evidence can produce a high-grade evaluation", () => {
  const job = parseJobIntake({
    raw_text: "2028届在校生 AI Agent 实习，每周3天，至少3个月，可远程。Python FastAPI LangGraph RAG Docker",
    company: "Remote AI",
    title: "AI Agent Python 后端实习生",
    source_reliability: 5,
  });
  const evidence = [
    { skill: "Python", project: "Camera Market", evidence: "FastAPI API", verification_status: "verified", active: true },
    { skill: "FastAPI", project: "Camera Market", evidence: "REST API", verification_status: "verified", active: true },
    { skill: "LangGraph", project: "Agent Demo", evidence: "状态工作流", verification_status: "verified", active: true },
    { skill: "RAG", project: "RAG Demo", evidence: "中文检索", verification_status: "verified", active: true },
    { skill: "Docker", project: "Camera Market", evidence: "容器化", verification_status: "verified", active: true },
  ];
  const result = evaluateJob(job, evidence, new Date("2026-07-24T00:00:00Z"), { graduation_year: 2028, major: "人工智能", degree: "本科", availability_days: 5, availability_months: 6, preferences: { internship_only: true, target_roles: ["AI 开发"], locations: ["远程"], work_modes: ["remote"], keywords: ["Python", "FastAPI", "LangGraph", "RAG", "Docker"] } });
  assert.equal(result.eligible, true);
  assert.equal(result.needs_confirmation, false);
  assert.ok(["S", "A"].includes(result.grade));
});

test("package excludes unverified evidence", () => {
  const job = parseJobIntake({
    raw_text: "2028届在校生实习，每周3天，至少3个月。Python FastAPI",
    company: "Example",
    title: "Python 实习生",
  });
  const evidence = [
    { id: "v1", skill: "Python", project: "Verified", evidence: "真实证据", verification_status: "verified", active: true },
    { id: "u1", skill: "FastAPI", project: "Draft", evidence: "未核验", verification_status: "draft", active: true },
  ];
  const evaluation = evaluateJob(job, evidence, new Date("2026-07-24T00:00:00Z"), { graduation_year: 2028, major: "人工智能", degree: "本科", availability_days: 5, availability_months: 6, preferences: { internship_only: true, target_roles: ["AI 开发"], locations: ["远程"], work_modes: ["remote"], keywords: ["Python", "FastAPI", "LangGraph", "RAG", "Docker"] } });
  const pack = buildApplicationPackage(job, evaluation, evidence, []);
  assert.equal(pack.evidence_refs.length, 1);
  assert.equal(pack.evidence_refs[0].id, "v1");
});

test("submission requires approved package and explicit user confirmation", () => {
  assert.equal(validateApplicationTransition("prepared", "ready_to_submit", { packageApproval: "pending" }).ok, false);
  assert.equal(validateApplicationTransition("prepared", "ready_to_submit", { packageApproval: "approved" }).ok, true);
  assert.equal(validateApplicationTransition("ready_to_submit", "submitted", { confirmedByUser: false }).ok, false);
  assert.equal(validateApplicationTransition("ready_to_submit", "submitted", { confirmedByUser: true }).ok, true);
});

test("readiness remains blocked when HR facts need confirmation", () => {
  const readiness = computeReadiness({
    evaluation: { eligible: true, needs_confirmation: true, confirmation_questions: ["是否接受2028届？"] },
    applicationPackage: { approval: "approved", truth_check: { passed: true, blockers: [] } },
    application: { status: "ready_to_submit" },
  });
  assert.equal(readiness.ready_to_submit, false);
  assert.deepEqual(readiness.blockers, ["是否接受2028届？"]);
});

test("explicit 2027-only restriction rejects a 2028 applicant", () => {
  const job = parseJobIntake({
    raw_text: "仅限2027届在校生，AI 开发实习，每周5天，至少6个月。",
    company: "Year Locked",
    title: "AI 开发实习生",
  });
  const result = evaluateJob(job, [], new Date("2026-07-24T00:00:00Z"), { graduation_year: 2028, major: "人工智能", degree: "本科", availability_days: 5, availability_months: 6, preferences: { internship_only: true, target_roles: ["AI 开发"], locations: ["远程"], work_modes: ["remote"], keywords: ["Python", "FastAPI", "LangGraph", "RAG", "Docker"] } });
  assert.equal(job.accepts_2028, false);
  assert.equal(result.eligible, false);
  assert.ok(result.hard_filter_reasons.includes("明确不接受 2028 届"));
});

test("verified project evidence is optional when saved profile or resume can support the package", () => {
  const job = parseJobIntake({
    raw_text: "接受2028届在校生实习，每周3天，至少3个月。Python FastAPI",
    company: "No Evidence",
    title: "Python 实习生",
    source_url: "https://example.com/jobs/python-intern",
  });
  const profile = {
    graduation_year: 2028,
    major: "人工智能",
    degree: "本科",
    availability_days: 5,
    availability_months: 6,
    preferences: { internship_only: true, target_roles: ["AI 开发"], locations: ["远程"], work_modes: ["remote"], keywords: ["Python", "FastAPI"] },
    profile_details: { summary: "使用 Python 和 FastAPI 完成过课程与个人项目", skills: ["Python", "FastAPI"] },
  };
  const evaluation = evaluateJob(job, [], new Date("2026-07-24T00:00:00Z"), profile);
  const pack = buildApplicationPackage(job, evaluation, [], [], { profile });
  assert.equal(pack.truth_check.passed, true);
  assert.equal(pack.truth_check.evidence_optional, true);
  assert.equal(pack.evidence_refs.length, 0);
});


test("same source URL keeps a stable job identity when JD text changes", () => {
  const first = parseJobIntake({ raw_text: "2028届实习，每周3天，至少3个月。Python", company: "A", title: "AI 实习生", source_url: "https://example.com/jobs/123" });
  const updated = parseJobIntake({ raw_text: "2028届实习，每周4天，至少4个月。Python FastAPI", company: "A", title: "AI 实习生", source_url: "https://example.com/jobs/123" });
  assert.deepEqual(jobIdentityParts(first), jobIdentityParts(updated));
});

test("approved package becomes invalid when referenced evidence changes", () => {
  const pack = { evidence_refs: [{ id: "e1", skill: "Python", project: "Project", evidence: "Built API" }] };
  const unchanged = [{ id: "e1", skill: "Python", project: "Project", evidence: "Built API", verification_status: "verified", active: true }];
  const changed = [{ id: "e1", skill: "Python", project: "Project", evidence: "Different claim", verification_status: "verified", active: true }];
  assert.equal(validatePackageEvidence(pack, unchanged).passed, true);
  assert.equal(validatePackageEvidence(pack, changed).passed, false);
});

test("approved package becomes invalid when evidence is deactivated", () => {
  const pack = { evidence_refs: [{ id: "e1", skill: "Python", project: "Project", evidence: "Built API" }] };
  const evidence = [{ id: "e1", skill: "Python", project: "Project", evidence: "Built API", verification_status: "verified", active: false }];
  const result = validatePackageEvidence(pack, evidence);
  assert.equal(result.passed, false);
  assert.equal(result.invalid_refs[0].reason, "evidence_missing_or_unverified");
});


test("source refresh preserves user-verified job facts", () => {
  const parsed = {
    accepts_students: null,
    accepts_2028: null,
    days_per_week: null,
    minimum_months: 2,
    salary: "unknown",
    status: "open",
  };
  const existing = {
    accepts_students: true,
    accepts_2028: true,
    days_per_week: 4,
    minimum_months: 6,
    salary: "300/天",
    status: "paused",
    hr_verified_fields: ["accepts_students", "accepts_2028", "days_per_week", "minimum_months", "status"],
    hr_verified_at: "2026-07-24T00:00:00Z",
  };
  const merged = preserveVerifiedJobFields(parsed, existing);
  assert.equal(merged.accepts_students, true);
  assert.equal(merged.accepts_2028, true);
  assert.equal(merged.days_per_week, 4);
  assert.equal(merged.minimum_months, 6);
  assert.equal(merged.status, "paused");
  assert.equal(merged.salary, "unknown");
  assert.deepEqual(merged.hr_verified_fields, existing.hr_verified_fields);
});

test("source refresh can update fields that were not manually verified", () => {
  const merged = preserveVerifiedJobFields(
    { accepts_2028: true, days_per_week: 5 },
    { accepts_2028: false, days_per_week: 3, hr_verified_fields: ["accepts_2028"] },
  );
  assert.equal(merged.accepts_2028, false);
  assert.equal(merged.days_per_week, 5);
});


test("configured profile without graduation year asks for the missing fact instead of inventing a cohort", () => {
  const job = parseJobIntake({ raw_text: "在校生实习，每周3天，至少3个月。Python", company: "Neutral", title: "开发实习生" });
  const result = evaluateJob(job, [], new Date("2026-08-05T00:00:00Z"), {
    graduation_year: null,
    major: "软件工程",
    degree: "本科",
    availability_days: 5,
    availability_months: 6,
    preferences: { target_roles: ["开发"], locations: [], work_modes: [], keywords: ["Python"], internship_only: true },
  });
  assert.equal(result.needs_confirmation, true);
  assert.ok(result.confirmation_questions.includes("请先在个人画像中填写毕业年份"));
  assert.equal(result.confirmation_questions.some((item) => item.includes("0 届")), false);
});
