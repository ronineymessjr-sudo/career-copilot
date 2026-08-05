import fs from "node:fs";
import assert from "node:assert/strict";

const required = ["WEB_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "CAREER_COPILOT_TEST_EMAIL", "CAREER_COPILOT_TEST_PASSWORD"];
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
assert.equal(runtime.payload.version, "2.0.0");
assert.equal(runtime.payload.agentRuntime, true);
assert.equal(runtime.payload.hybridJobRanking, true);
assert.equal(runtime.payload.mcpServer, true);
assert.equal(runtime.payload.agentEvaluation, true);
assert.equal(runtime.payload.automaticSubmission, false);
assert.equal(runtime.payload.automaticEmailSend, false);
const anonymous = await jsonFetch(`${webUrl}/api/control/agents/run`);
assert.equal(anonymous.response.status, 401, anonymous.payload);
const runs = await jsonFetch(`${webUrl}/api/control/agents/run`, { headers });
assert.equal(runs.response.ok, true, runs.payload);
assert.equal(Array.isArray(runs.payload.runs), true);
const scores = await jsonFetch(`${webUrl}/api/control/ranking/jobs`, { headers });
assert.equal(scores.response.ok, true, scores.payload);
assert.equal(Array.isArray(scores.payload.scores), true);
const resumes = await jsonFetch(`${webUrl}/api/control/resumes`, { headers });
assert.equal(resumes.response.ok, true, resumes.payload);
assert.equal(Array.isArray(resumes.payload.resumes), true);
const mcpInit = await jsonFetch(`${webUrl}/api/mcp`, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "career-copilot-e2e", version: "1" } } }) });
assert.equal(mcpInit.response.ok, true, mcpInit.payload);
assert.equal(mcpInit.payload.result.serverInfo.name, "career-copilot-mcp");
const result = {
  version: "2.0.0",
  verified_at: new Date().toISOString(),
  web_url: webUrl,
  runtime_ok: true,
  anonymous_agent_api_blocked: true,
  authenticated_agent_runs_ok: true,
  authenticated_scores_ok: true,
  authenticated_resumes_ok: true,
  mcp_initialize_ok: true,
  mutations_performed: false,
  automatic_submission: false,
  secrets_redacted: true,
};
fs.writeFileSync(process.env.E2E_OUTPUT || "PRODUCTION_E2E_M08.json", `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
