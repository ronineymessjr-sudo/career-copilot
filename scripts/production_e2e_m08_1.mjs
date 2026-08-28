import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const base = (process.env.WEB_URL || "https://career-copilot-v2.photomagic.workers.dev").replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 2;
const execFileAsync = promisify(execFile);

async function requestWithCurl(url) {
  const curl = process.platform === "win32" ? "curl.exe" : "curl";
  const marker = "__CAREER_COPILOT_STATUS__";
  const { stdout } = await execFileAsync(curl, [
    "--silent", "--show-error", "--location",
    "--retry", "3", "--retry-all-errors", "--retry-delay", "2",
    "--connect-timeout", "15", "--max-time", String(REQUEST_TIMEOUT_MS / 1_000),
    "--write-out", `\\n${marker}%{http_code}`,
    url,
  ], { encoding: "utf8", maxBuffer: 2 * 1024 * 1024, timeout: REQUEST_TIMEOUT_MS + 15_000 });
  const statusMarker = `${String.fromCharCode(10)}${marker}`;
  const statusIndex = stdout.lastIndexOf(statusMarker);
  if (statusIndex < 0) throw new Error(`curl did not return an HTTP status for ${url}`);
  const body = stdout.slice(0, statusIndex);
  const status = Number(stdout.slice(statusIndex + statusMarker.length));
  return { ok: status >= 200 && status < 300, status, body };
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await requestWithCurl(url);
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
