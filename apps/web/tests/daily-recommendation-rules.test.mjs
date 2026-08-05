import test from "node:test";
import assert from "node:assert/strict";
import { recommendationDateForTimezone } from "../lib/daily-recommendation-rules.mjs";

test("daily recommendation date follows the configured Asia timezone", () => {
  const instant = new Date("2026-08-04T16:30:00.000Z");
  assert.equal(recommendationDateForTimezone(instant, "Asia/Shanghai"), "2026-08-05");
  assert.equal(recommendationDateForTimezone(instant, "UTC"), "2026-08-04");
});

test("invalid timezone safely falls back to UTC date", () => {
  assert.equal(recommendationDateForTimezone(new Date("2026-08-05T02:00:00.000Z"), "Bad/Timezone"), "2026-08-05");
});
