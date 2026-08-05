import test from "node:test";
import assert from "node:assert/strict";
import { allowedStatusTransitions, applicationStatusLabel, buildApplicationTimeline, followUpState, materialChangeSummary, nextMaterialRevision } from "../lib/application-lifecycle.mjs";
import { tailoredResumeDocx } from "../lib/docx-export.mjs";

test("material versions identify changed fields and increment safely", () => {
  assert.deepEqual(materialChangeSummary({ greeting: "a", body: "b" }, { greeting: "a", body: "c" }).changed_fields, ["body"]);
  assert.equal(nextMaterialRevision([{ revision: 1 }, { revision: 4 }]), 5);
});

test("application status timeline preserves explicit user changes", () => {
  const timeline = buildApplicationTimeline({ status: "prepared" }, [
    { to_status: "submitted", reason: "用户确认", created_at: "2026-08-05T10:00:00Z" },
    { to_status: "interview", reason: "收到面试", created_at: "2026-08-06T10:00:00Z" },
  ]);
  assert.equal(timeline[1].label, "进入面试");
  assert.equal(applicationStatusLabel("offer"), "收到 Offer");
  assert.ok(allowedStatusTransitions("submitted").includes("interview"));
});

test("follow-up state detects overdue actions", () => {
  const state = followUpState({ status: "submitted", next_follow_up_at: "2026-08-01T00:00:00Z" }, new Date("2026-08-05T00:00:00Z"));
  assert.equal(state.overdue, true);
});

test("DOCX export returns a valid zip container", () => {
  const bytes = tailoredResumeDocx({}, { company_name: "示例公司", title: "产品实习生" }, { tailored_resume: { candidate: { name: "测试用户" }, summary: "真实简介", skills: ["分析"] } });
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.ok(bytes.length > 500);
});
