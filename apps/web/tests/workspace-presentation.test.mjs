import test from "node:test";
import assert from "node:assert/strict";
import { skillLabel, workplaceLabel } from "../lib/workspace-presentation.mjs";

test("presentation uses understandable labels without changing skill identifiers", () => {
  assert.equal(skillLabel("civil_commercial_law"), "民商法");
  assert.equal(skillLabel("tool calling"), "工具调用");
  assert.equal(skillLabel("unlisted technology"), "unlisted technology");
});

test("unknown workplace remains explicitly unverified", () => {
  assert.equal(workplaceLabel("remote"), "远程");
  assert.equal(workplaceLabel("onsite"), "线下");
  assert.equal(workplaceLabel("unknown"), "办公方式待核验");
  assert.equal(workplaceLabel(null), "办公方式待核验");
});
