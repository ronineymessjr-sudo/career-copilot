import test from "node:test";
import assert from "node:assert/strict";
import { applyLearnedSignals, buildProductFunnel, dailyNotificationPayload, deduplicateJobPool, jobFingerprint, learnRecommendationSignals, nextLifecycleState, sourceQualitySummary } from "../lib/platform-scale.mjs";

test("job fingerprints normalize common duplicate variants", () => {
  assert.equal(jobFingerprint({ company_name: "Example AI", title: "AI Intern", city: "上海", source_url: "https://x/jobs/1?ref=a" }), jobFingerprint({ company_name: " example ai ", title: "AI Internship", city: "上海", source_url: "https://x/jobs/1" }));
});

test("deduplication keeps the row with an active application", () => {
  const result = deduplicateJobPool([
    { id: "a", job_fingerprint: "same", source_reliability: 5, visibility: "public" },
    { id: "b", job_fingerprint: "same", source_reliability: 3, visibility: "private" },
  ], { applicationJobIds: ["b"] });
  assert.equal(result.jobs[0].id, "b");
  assert.equal(result.duplicates[0].duplicate_of_job_id, "b");
});

test("lifecycle closes only after repeated misses", () => {
  assert.equal(nextLifecycleState({ missed_discovery_count: 0 }, false).lifecycle_state, "stale");
  assert.equal(nextLifecycleState({ missed_discovery_count: 2 }, false).lifecycle_state, "closed");
  assert.equal(nextLifecycleState({ missed_discovery_count: 8 }, true).lifecycle_state, "open");
});

test("behavior learning changes recommendation score conservatively", () => {
  const learned = learnRecommendationSignals([{ job_id: "1", feedback_type: "saved" }], [{ id: "1", company_name: "Acme", title: "Data Analyst", city: "上海" }]);
  const adjusted = applyLearnedSignals({ company_name: "Acme", title: "Data Analyst", city: "上海" }, { score: 70, reasons: [] }, learned);
  assert.ok(adjusted.score > 70);
});

test("product funnel and source quality remain evidence based", () => {
  const funnel = buildProductFunnel({ jobs: [{ id: "1" }], feedback: [{ job_id: "1" }], packages: [{ job_id: "1" }], applications: [{ status: "submitted" }] });
  assert.equal(funnel.find((item) => item.stage === "submitted").count, 1);
  const quality = sourceQualitySummary([{ id: "s", name: "Source", provider: "greenhouse", enabled: true, last_status: "success" }], [{ raw_payload: { discovery_source_id: "s" }, lifecycle_state: "open" }]);
  assert.equal(quality[0].open, 1);
  assert.match(dailyNotificationPayload({ recommended: 4, prepared: 2 }).body, /2/);
});
