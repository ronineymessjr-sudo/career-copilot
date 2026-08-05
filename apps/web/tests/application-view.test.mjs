import test from "node:test";
import assert from "node:assert/strict";
import { attachSubmissionReadiness, firstByKey, normalizeHttpUrl, resolveSubmissionTarget } from "../lib/application-view.mjs";

test("firstByKey preserves the newest row when input is ordered newest first", () => {
  const rows = [
    { job_id: "job-1", updated_at: "2026-08-05", value: "new" },
    { job_id: "job-1", updated_at: "2026-08-01", value: "old" },
  ];
  assert.equal(firstByKey(rows, "job_id").get("job-1")?.value, "new");
});

test("submission target prefers the approved dispatch URL and rejects unsafe protocols", () => {
  const submission = resolveSubmissionTarget({
    application: { channel: "platform" },
    job: { source_url: "https://jobs.example.com/fallback" },
    dispatch: { target_url: "https://apply.example.com/role" },
  });
  assert.equal(submission.target_url, "https://apply.example.com/role");
  assert.equal(submission.can_open, true);
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
});

test("ready applications are blocked when no external entry exists", () => {
  const result = attachSubmissionReadiness({ ready_to_submit: true, blockers: [] }, { can_open: false });
  assert.equal(result.ready_to_submit, false);
  assert.match(result.blockers[0], /缺少有效投递入口/);
});
