import fs from "node:fs";
import assert from "node:assert/strict";

const required = [
  "WEB_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "CAREER_COPILOT_TEST_EMAIL",
  "CAREER_COPILOT_TEST_PASSWORD",
];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
const webUrl = process.env.WEB_URL.replace(/\/$/, "");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function jsonFetch(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = {};
  if (text) { try { payload = JSON.parse(text); } catch { payload = { raw: text }; } }
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
assert.equal(runtime.payload.version, "0.9.0");
assert.equal(runtime.payload.documentKnowledgeBase, true);
assert.equal(runtime.payload.pgvectorRetrieval, true);
assert.equal(runtime.payload.citationRequired, true);
assert.equal(runtime.payload.durableHumanInterrupts, true);
assert.equal(runtime.payload.automaticEvidencePromotion, false);
assert.equal(runtime.payload.automaticSubmission, false);

const anonymous = await jsonFetch(`${webUrl}/api/control/knowledge/documents`);
assert.equal(anonymous.response.status, 401, anonymous.payload);
const documents = await jsonFetch(`${webUrl}/api/control/knowledge/documents`, { headers });
assert.equal(documents.response.ok, true, documents.payload);
assert.equal(Array.isArray(documents.payload.documents), true);
const workflows = await jsonFetch(`${webUrl}/api/control/workflows`, { headers });
assert.equal(workflows.response.ok, true, workflows.payload);
assert.equal(Array.isArray(workflows.payload.workflows), true);
const search = await jsonFetch(`${webUrl}/api/control/knowledge/search`, {
  method: "POST",
  headers,
  body: JSON.stringify({ query: "Career Vault verified evidence", limit: 3 }),
});
assert.equal(search.response.ok, true, search.payload);
assert.equal(Array.isArray(search.payload.results), true);
assert.equal(search.payload.context?.requires_human_verification, true);

const result = {
  version: "0.9.0",
  verified_at: new Date().toISOString(),
  web_url: webUrl,
  runtime_ok: true,
  anonymous_knowledge_blocked: true,
  authenticated_documents_ok: true,
  authenticated_workflows_ok: true,
  authenticated_search_ok: true,
  retrieval_requires_human_verification: true,
  automatic_evidence_promotion: false,
  automatic_submission: false,
  mutations_performed: false,
  secrets_redacted: true,
};
fs.writeFileSync(process.env.E2E_OUTPUT || "PRODUCTION_E2E_M07.json", `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
