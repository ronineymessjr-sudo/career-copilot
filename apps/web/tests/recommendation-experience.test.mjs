import test from "node:test";
import assert from "node:assert/strict";
import { applyRecommendationFeedback, buildOnboardingChecklist, groupDailyRecommendations, normalizeRecommendationPreferences, sourceHealthState } from "../lib/recommendation-experience.mjs";

test("recommendation preferences remain bounded and neutral by default", () => {
  const value = normalizeRecommendationPreferences({ minimum_score: 999, exploration_ratio: -10, excluded_companies: ["A", "A", ""] });
  assert.equal(value.minimum_score, 100);
  assert.equal(value.exploration_ratio, 0);
  assert.deepEqual(value.excluded_companies, ["A"]);
});

test("feedback changes ranking without deleting the job", () => {
  const saved = applyRecommendationFeedback({ id: "1", recommendation: { score: 70, reasons: [] } }, { feedback_type: "saved" });
  const rejected = applyRecommendationFeedback({ id: "2", recommendation: { score: 70, reasons: [] } }, { feedback_type: "not_interested" });
  assert.equal(saved.recommendation.score, 82);
  assert.equal(saved.hidden_by_preference, false);
  assert.equal(rejected.hidden_by_preference, true);
});

test("daily groups keep top, fresh, confirmation and exploration separate", () => {
  const groups = groupDailyRecommendations([
    { id: "top", status: "open", recommendation: { score: 90 }, evaluation: { eligible: true, needs_confirmation: false } },
    { id: "confirm", status: "open", recommendation: { score: 80 }, evaluation: { eligible: true, needs_confirmation: true } },
    { id: "explore", status: "open", recommendation: { score: 55 }, evaluation: { eligible: true, needs_confirmation: false } },
  ], { seenJobIds: ["top", "confirm", "explore"], now: new Date("2026-08-05T00:00:00Z") });
  assert.equal(groups.top.jobs[0].id, "top");
  assert.equal(groups.confirm.jobs[0].id, "confirm");
  assert.equal(groups.explore.jobs[0].id, "explore");
});

test("onboarding checklist reflects actual product prerequisites", () => {
  const checklist = buildOnboardingChecklist({ profileCompleteness: 80, resumeCount: 2, sourceCount: 1, jobCount: 20, recommendationCount: 5 });
  assert.equal(checklist.finished, true);
  assert.equal(checklist.score, 100);
});

test("source health marks stale and failed sources", () => {
  assert.equal(sourceHealthState({ enabled: true, last_status: "failed", last_error: "timeout" }).key, "failed");
  assert.equal(sourceHealthState({ enabled: true, last_status: "success", last_checked_at: "2026-08-01T00:00:00Z" }, new Date("2026-08-05T00:00:00Z")).key, "stale");
});
