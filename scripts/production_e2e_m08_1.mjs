import assert from "node:assert/strict";
import https from "node:https";

const base = (process.env.WEB_URL || "https://career-copilot-v2.photomagic.workers.dev").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 4;

function requestWithIpv4(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { family: 4, timeout: REQUEST_TIMEOUT_MS }, (response) => {
      const chunks = [];
      response.setEncoding("utf8");
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({
        ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
        status: response.statusCode ?? 0,
        body: chunks.join(""),
      }));
    });
    request.on("timeout", () => request.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`)));
    request.on("error", reject);
  });
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await requestWithIpv4(url);
      if (response.ok || attempt === MAX_ATTEMPTS) {
        return { ok: response.ok, status: response.status, json: async () => JSON.parse(response.body) };
      }
      lastError = new Error(`HTTP ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
  throw lastError ?? new Error(`Request failed: ${url}`);
}

const response = await fetchWithRetry(`${base}/api/runtime`);
assert.equal(response.ok, true);
const runtime = await response.json();
assert.equal(runtime.version, "2.0.2");
assert.equal(runtime.publicPortfolioPlayground, true);
assert.equal(runtime.deterministicAgentDemoApi, true);
assert.equal(runtime.dockerDemoStack, true);
assert.equal(runtime.automaticSubmission, false);
const playground = await fetchWithRetry(`${base}/playground`);
assert.equal(playground.ok, true);
const output = {
  version: runtime.version,
  runtime_ok: true,
  playground_public: true,
  automatic_submission: runtime.automaticSubmission,
  checked_at: new Date().toISOString(),
};
console.log(JSON.stringify(output, null, 2));
