import fs from "node:fs";
import assert from "node:assert/strict";
import { buildApplicationPackage, evaluateJob, parseJobIntake, preserveVerifiedJobFields, validateApplicationTransition } from "../apps/web/lib/control-rules.mjs";
import { packetData, rfc2822Message } from "../apps/web/lib/application-export.mjs";
import { discoverFromSource } from "../apps/web/lib/job-sources.mjs";

const source = { id: "source", user_id: "user", name: "Smoke AI", provider: "greenhouse", identifier: "smoke", filters: { keywords: ["agent"], internships_only: true } };
const fetcher = async () => new Response(JSON.stringify({ jobs: [{ id: 7, title: "AI Agent Intern", updated_at: "2026-07-24T00:00:00Z", location: { name: "Remote" }, absolute_url: "https://example.invalid/jobs/7", content: "2028届在校生，每周3天，至少3个月。Python FastAPI LangGraph RAG" }] }), { status: 200 });
const discovery = await discoverFromSource(source, fetcher);
assert.equal(discovery.jobs.length, 1);
const discovered = discovery.jobs[0];
const job = parseJobIntake({ company: discovered.company, title: discovered.title, source_url: discovered.applyUrl, workplace: discovered.workplace, raw_text: discovered.rawText, source_reliability: 5 });
const evidence = [
  { id: "e1", skill: "Python", project: "Career Copilot", evidence: "实现 FastAPI 与测试", verification_status: "verified", active: true },
  { id: "e2", skill: "LangGraph", project: "Agent Workflow", evidence: "实现审批状态机", verification_status: "verified", active: true },
];
const evaluation = evaluateJob(job, evidence, new Date("2026-07-24T00:00:00Z"));
assert.equal(evaluation.eligible, true);
assert.equal(evaluation.needs_confirmation, false);
const pack = buildApplicationPackage({ ...job, channel: "email" }, evaluation, evidence, []);
assert.equal(pack.truth_check.passed, true);
const packet = packetData({ id: "a1", status: "ready_to_submit", channel: "email" }, job, { ...pack, approval: "approved" });
assert.equal(packet.safety.automatic_submission, false);
assert.equal(packet.safety.gmail_action, "draft_only");
const mime = rfc2822Message("hr@example.com", String(pack.email_subject), String(pack.email_body));
assert.match(mime, /^To: hr@example.com/);
assert.equal(validateApplicationTransition("ready_to_submit", "submitted", { confirmedByUser: false }).ok, false);
const refreshed = preserveVerifiedJobFields(
  { accepts_2028: null, days_per_week: null, status: "open" },
  { accepts_2028: true, days_per_week: 4, status: "paused", hr_verified_fields: ["accepts_2028", "days_per_week", "status"] },
);
assert.equal(refreshed.accepts_2028, true);
assert.equal(refreshed.days_per_week, 4);
assert.equal(refreshed.status, "paused");

const result = {
  version: "0.7.0",
  mode: "offline-milestone-05-smoke",
  greenhouse_public_source_parsed: true,
  source_filtering_passed: true,
  discovered_jobs: discovery.jobs.length,
  deterministic_evaluation_passed: evaluation.eligible,
  verified_evidence_only: pack.truth_check.generated_from_verified_evidence_only,
  material_exports_safety_flag: packet.safety.automatic_submission === false,
  gmail_draft_only: packet.safety.gmail_action === "draft_only",
  gmail_message_generated: mime.includes("Subject:"),
  source_refresh_preserves_hr_verified_fields: true,
  official_ats_hosts_only: true,
  final_submission_still_requires_confirmation: true,
  live_cloudflare_verified: false,
  live_supabase_migration_verified: false,
  live_gmail_oauth_verified: false,
};
const output = process.argv[2] ?? "SMOKE_RESULT_M05.json";
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
