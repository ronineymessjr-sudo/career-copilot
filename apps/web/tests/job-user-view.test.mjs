import test from "node:test";
import assert from "node:assert/strict";
import { mergeJobOverride, selectJobPoolRows } from "../lib/job-user-view.mjs";

test("job override only replaces verified fields", () => {
  const job = { id: "j1", days_per_week: 5, city: "上海", salary: "200/day" };
  const merged = mergeJobOverride(job, { verified_fields: ["days_per_week", "city"], days_per_week: 3, city: null, salary: "999/day" });
  assert.equal(merged.days_per_week, 3);
  assert.equal(merged.city, null);
  assert.equal(merged.salary, "200/day");
});

test("job pool deduplicates public jobs but keeps user's active application row", () => {
  const rows = [
    { id: "public-new", source_id: "same", visibility: "public", updated_at: "2026-08-05T00:00:00Z" },
    { id: "application-row", source_id: "same", visibility: "public", updated_at: "2026-07-01T00:00:00Z" },
  ];
  const selected = selectJobPoolRows(rows, { currentUserId: "u1", applicationJobIds: ["application-row"] });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "application-row");
});
