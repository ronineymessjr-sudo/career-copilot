import fs from "node:fs";
import assert from "node:assert/strict";
import {
  buildApplicationPackage,
  computeReadiness,
  evaluateJob,
  jobIdentityParts,
  parseJobIntake,
  validateApplicationTransition,
  validatePackageEvidence,
} from "../apps/web/lib/control-rules.mjs";

const job = parseJobIntake({
  company: "Smoke AI Lab",
  title: "AI Agent 后端实习生",
  source_url: "https://example.invalid/jobs/agent-intern",
  source_reliability: 5,
  raw_text: "接受2028届在校生，AI Agent 后端实习。每周3天，至少3个月，可远程。Python FastAPI LangGraph RAG Docker。",
});
const evidence = [
  { id: "ev-python", skill: "Python", project: "Camera Market", evidence: "实现 FastAPI 接口和测试", verification_status: "verified", active: true },
  { id: "ev-graph", skill: "LangGraph", project: "Agent Workflow", evidence: "实现状态节点和人工审批", verification_status: "verified", active: true },
  { id: "ev-draft", skill: "Docker", project: "Unverified", evidence: "草稿证据", verification_status: "draft", active: true },
];
const evaluation = evaluateJob(job, evidence, new Date("2026-07-24T00:00:00Z"));
assert.equal(evaluation.eligible, true);
assert.equal(evaluation.needs_confirmation, false);
const applicationPackage = buildApplicationPackage(job, evaluation, evidence, []);
assert.equal(applicationPackage.truth_check.passed, true);
assert.equal(applicationPackage.evidence_refs.some((item) => item.id === "ev-draft"), false);
assert.equal(validateApplicationTransition("prepared", "ready_to_submit", { packageApproval: "approved" }).ok, true);
assert.equal(validateApplicationTransition("ready_to_submit", "submitted", { confirmedByUser: false }).ok, false);
const readiness = computeReadiness({
  evaluation,
  applicationPackage: { ...applicationPackage, approval: "approved" },
  application: { status: "ready_to_submit" },
});
assert.equal(readiness.ready_to_submit, true);

const stableIdentityAfterDescriptionChange = JSON.stringify(jobIdentityParts(job)) === JSON.stringify(jobIdentityParts({ ...job, description: `${job.description} 更新后的 JD` }));
assert.equal(stableIdentityAfterDescriptionChange, true);
const evidenceStillValid = validatePackageEvidence(applicationPackage, evidence);
assert.equal(evidenceStillValid.passed, true);
const evidenceChanged = validatePackageEvidence(applicationPackage, evidence.map((item) => item.id === "ev-python" ? { ...item, evidence: "已修改的不同声明" } : item));
assert.equal(evidenceChanged.passed, false);

const result = {
  version: "0.6.1",
  mode: "offline-deterministic-smoke",
  parsed_2028: job.accepts_2028,
  parsed_students: job.accepts_students,
  parsed_days_per_week: job.days_per_week,
  parsed_minimum_months: job.minimum_months,
  evaluation_eligible: evaluation.eligible,
  evaluation_needs_confirmation: evaluation.needs_confirmation,
  package_truth_passed: applicationPackage.truth_check.passed,
  verified_evidence_count: applicationPackage.evidence_refs.length,
  draft_evidence_excluded: true,
  approved_package_can_be_ready: true,
  submission_without_user_confirmation: false,
  automatic_job_submission: false,
  stable_job_identity_on_jd_update: stableIdentityAfterDescriptionChange,
  current_evidence_revalidated_before_submission: true,
  changed_evidence_blocks_submission: evidenceChanged.passed === false,
  live_cloudflare_verified: false,
  live_supabase_migration_verified: false,
};
const output = process.argv[2] ?? "SMOKE_RESULT_M04.json";
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
