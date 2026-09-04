import test from "node:test";
import assert from "node:assert/strict";
import { packetData, packetMarkdown, rfc2822Message, tailoredResumeHtmlWithLayout, validateRenderedResumeHtml } from "../lib/application-export.mjs";

const application = { id: "a1", status: "ready_to_submit", channel: "email" };
const job = { company_name: "Example", title: "AI Intern", source_url: "https://example.com/job", recruiter_email: "hr@example.com" };
const pack = { approval: "approved", greeting: "Hello", email_subject: "Apply", email_body: "Body", evidence_refs: [{ project: "P", skill: "Python", evidence: "Built API" }], truth_check: { passed: true } };
const resumePack = { ...pack, tailored_resume: { candidate: { name: "任毅文", headline: "AI 产品实习生" }, summary: "用可复核证据构建求职材料。", skills: ["Python", "RAG"] } };

test("export packet preserves approval-first safety metadata", () => {
  const data = packetData(application, job, pack);
  assert.equal(data.safety.automatic_submission, false);
  assert.equal(data.safety.gmail_action, "draft_only");
  assert.match(packetMarkdown(application, job, pack), /不会自动投递/);
});

test("RFC 2822 draft removes header newlines", () => {
  const message = rfc2822Message("hr@example.com\nBcc: attacker@example.com", "Apply\nInjected", "Body");
  assert.match(message, /^To: hr@example.comBcc: attacker@example.com\r\nSubject: Apply Injected/m);
  assert.doesNotMatch(message, /\r\nBcc:/);
});

test("resume HTML render validation checks structure and key fields", () => {
  const html = tailoredResumeHtmlWithLayout(application, job, resumePack, "standard");
  const validation = validateRenderedResumeHtml(html, application, job, resumePack);
  assert.equal(validation.passed, true);
  assert.equal(validateRenderedResumeHtml("<html><body>空壳</body></html>", application, job, resumePack).passed, false);
});
