import test from "node:test";
import assert from "node:assert/strict";
import { packetData, packetMarkdown, rfc2822Message } from "../lib/application-export.mjs";

const application = { id: "a1", status: "ready_to_submit", channel: "email" };
const job = { company_name: "Example", title: "AI Intern", source_url: "https://example.com/job", recruiter_email: "hr@example.com" };
const pack = { approval: "approved", greeting: "Hello", email_subject: "Apply", email_body: "Body", evidence_refs: [{ project: "P", skill: "Python", evidence: "Built API" }], truth_check: { passed: true } };

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
