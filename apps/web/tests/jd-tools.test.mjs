import test from "node:test";
import assert from "node:assert/strict";
import { decomposeJd } from "../lib/jd-tools.mjs";

const profile = { graduation_year: 2028, availability_days: 5, availability_months: 6, skills: ["Python"], preferences: { work_modes: ["onsite"], locations: ["南京", "南通"], onsite_locations: ["南京浦口区", "南通崇川区"] } };

test("JD accepts a graduating year inside the stated range", () => {
  const result = decomposeJd("岗位：研发实习生\n接受2027-2029届在校生\n每周5天，至少6个月\n南京浦口区现场办公\n熟悉Python", profile);
  assert.equal(result.conditions.find((item) => item.label === "毕业届别").status, "pass");
});

test("JD keeps district restrictions when broader city preferences also exist", () => {
  const result = decomposeJd("岗位：研发实习生\n接受2028届在校生\n每周5天，至少6个月\n南京建邺区现场办公", profile);
  assert.equal(result.conditions.find((item) => item.label === "工作地点").status, "block");
  const unspecified = decomposeJd("岗位：研发实习生\n接受2028届在校生\n每周5天，至少6个月\n南京现场办公", profile);
  assert.equal(unspecified.conditions.find((item) => item.label === "工作地点").status, "confirm");
});

test("JD separates verified evidence from self-reported and pending skills", () => {
  const result = decomposeJd("岗位：研发实习生\n熟悉Python、React、FastAPI", profile, [
    { id: "e1", skill: "React", project: "UI", evidence: "实现React组件", verification_status: "verified" },
    { id: "e2", skill: "FastAPI", project: "API", evidence: "FastAPI接口", verification_status: "draft" },
    { id: "e3", skill: "Python", project: "Old", evidence: "Python脚本", verification_status: "verified", active: false },
  ]);
  assert.ok(result.matched.includes("react"));
  assert.ok(result.profile_only.includes("python"));
  const pending = result.requirements.flatMap((item) => item.skills).find((item) => item.skill === "fastapi");
  assert.equal(pending.status, "pending");
  assert.equal(pending.evidence.length, 0);
});
