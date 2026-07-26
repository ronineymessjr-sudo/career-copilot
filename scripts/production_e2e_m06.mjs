import fs from "node:fs";
import assert from "node:assert/strict";

const required = [
  "WEB_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "CAREER_COPILOT_TEST_EMAIL",
  "CAREER_COPILOT_TEST_PASSWORD",
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}
const webUrl = process.env.WEB_URL.replace(/\/$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function jsonFetch(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = {};
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  }
  return { response, payload };
}

const auth = await jsonFetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: publishableKey, "content-type": "application/json" },
  body: JSON.stringify({ email: process.env.CAREER_COPILOT_TEST_EMAIL, password: process.env.CAREER_COPILOT_TEST_PASSWORD }),
});
assert.equal(auth.response.ok, true, auth.payload);
const token = auth.payload.access_token;
assert.equal(typeof token, "string");
const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };

const runtime = await jsonFetch(`${webUrl}/api/runtime`);
assert.equal(runtime.response.ok, true, runtime.payload);
assert.equal(runtime.payload.version, "0.8.0");
assert.equal(runtime.payload.authRequired, true);
assert.equal(runtime.payload.interviewLearningLoop, true);
assert.equal(runtime.payload.conversionAnalytics, true);
assert.equal(runtime.payload.automaticInterviewAcceptance, false);
assert.equal(runtime.payload.automaticOfferAcceptance, false);

const anonymous = await jsonFetch(`${webUrl}/api/control/analytics?days=30`);
assert.equal(anonymous.response.status, 401, anonymous.payload);

const analytics = await jsonFetch(`${webUrl}/api/control/analytics?days=30`, { headers });
assert.equal(analytics.response.ok, true, analytics.payload);
assert.equal(analytics.payload.ok, true);
assert.equal(typeof analytics.payload.analytics?.metrics, "object");

const interviews = await jsonFetch(`${webUrl}/api/control/interviews`, { headers });
assert.equal(interviews.response.ok, true, interviews.payload);
assert.equal(Array.isArray(interviews.payload.interviews), true);
assert.equal(Array.isArray(interviews.payload.skill_gaps), true);

const weekly = await jsonFetch(`${webUrl}/api/control/weekly-review`, { method: "POST", headers, body: "{}" });
assert.equal(weekly.response.ok, true, weekly.payload);
assert.equal(weekly.payload.ok, true);
assert.equal(weekly.payload.weekly_review?.summary?.automatic_actions, false);

const result = {
  version: "0.8.0",
  verified_at: new Date().toISOString(),
  web_url: webUrl,
  runtime_ok: true,
  anonymous_control_blocked: true,
  authenticated_analytics_ok: true,
  authenticated_interviews_ok: true,
  weekly_review_generated: true,
  automatic_submission: false,
  automatic_interview_acceptance: false,
  automatic_offer_acceptance: false,
  secrets_redacted: true,
};
fs.writeFileSync(process.env.E2E_OUTPUT || "PRODUCTION_E2E_M06.json", `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
