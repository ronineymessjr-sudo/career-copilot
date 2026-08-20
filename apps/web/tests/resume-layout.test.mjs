import test from "node:test";
import assert from "node:assert/strict";
import { tailoredResumeHtmlWithLayout } from "../lib/application-export.mjs";

const application = { id: "a1", status: "ready_to_submit", channel: "email" };
const job = { company_name: "Example", title: "AI 产品实习", source_url: "https://example.com/job" };
const pack = { approval: "approved", truth_check: { passed: true }, tailored_resume: { candidate: { name: "任毅文", headline: "AI 应用", email: "candidate@example.com" }, summary: "构建 AI 应用。", skills: ["Python"], projects: [] } };

test("resume export supports explicit layout variants without changing content", () => {
  const compact = tailoredResumeHtmlWithLayout(application, job, pack, "compact");
  const portfolio = tailoredResumeHtmlWithLayout(application, job, pack, "portfolio");
  assert.match(compact, /data-resume-layout="compact"/);
  assert.match(portfolio, /data-resume-layout="portfolio"/);
  assert.match(compact, /构建 AI 应用/);
  assert.match(portfolio, /background:#102a43/);
});

test("unknown resume layout fails closed to standard", () => {
  assert.match(tailoredResumeHtmlWithLayout(application, job, pack, "unknown"), /data-resume-layout="standard"/);
});
