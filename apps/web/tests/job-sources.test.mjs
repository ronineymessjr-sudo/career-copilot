import test from "node:test";
import assert from "node:assert/strict";
import { discoverFromSource, htmlToText, passesSourceFilters, sourceEndpoint } from "../lib/job-sources.mjs";

test("Greenhouse adapter maps public job board JSON", async () => {
  const source = { id: "s1", user_id: "u1", name: "Example AI", provider: "greenhouse", identifier: "example", filters: { keywords: ["AI"], internships_only: true } };
  const fetcher = async () => new Response(JSON.stringify({ jobs: [{ id: 42, title: "AI Agent Intern", updated_at: "2026-07-24T00:00:00Z", location: { name: "Remote" }, absolute_url: "https://boards.greenhouse.io/example/jobs/42", content: "<p>2028届实习，Python &amp; RAG</p>" }] }), { status: 200 });
  const result = await discoverFromSource(source, fetcher);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].externalId, "42");
  assert.equal(result.jobs[0].workplace, "remote");
  assert.match(result.jobs[0].rawText, /Python & RAG/);
});

test("Lever adapter maps published postings and filters non-intern roles", async () => {
  const source = { id: "s2", user_id: "u1", name: "Lever AI", provider: "lever", identifier: "lever-ai", filters: { keywords: ["agent"], internships_only: true } };
  const payload = [
    { id: "j1", text: "Agent Intern", categories: { location: "Shanghai", commitment: "Intern" }, descriptionPlain: "AI agent internship", hostedUrl: "https://jobs.lever.co/lever-ai/j1", applyUrl: "https://jobs.lever.co/lever-ai/j1/apply", workplaceType: "hybrid" },
    { id: "j2", text: "Agent Engineer", categories: { location: "Shanghai", commitment: "Fulltime" }, descriptionPlain: "AI agent fulltime", hostedUrl: "https://jobs.lever.co/lever-ai/j2", workplaceType: "on-site" },
  ];
  const fetcher = async () => new Response(JSON.stringify(payload), { status: 200 });
  const result = await discoverFromSource(source, fetcher);
  assert.equal(result.seen, 2);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].applyUrl, "https://jobs.lever.co/lever-ai/j1/apply");
});

test("source filters enforce keywords, exclusions, locations, and internship boundary", () => {
  const job = { externalId: "1", company: "A", title: "AI Agent 实习生", rawText: "2028届 Python RAG", sourceUrl: "https://x", applyUrl: "https://x", location: "上海", workplace: "onsite", publishedAt: null, deadline: null, salary: "", sourcePayload: {} };
  assert.equal(passesSourceFilters(job, { keywords: ["rag"], locations: ["上海"], internships_only: true }), true);
  assert.equal(passesSourceFilters(job, { exclude_keywords: ["python"] }), false);
  assert.equal(passesSourceFilters(job, { locations: ["北京"] }), false);
});

test("source endpoints use official public ATS paths", () => {
  assert.equal(sourceEndpoint({ id: "1", user_id: "u", name: "A", provider: "greenhouse", identifier: "acme", base_url: "http://127.0.0.1:3000" }), "https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true");
  assert.equal(sourceEndpoint({ id: "2", user_id: "u", name: "B", provider: "lever", identifier: "acme", base_url: "http://169.254.169.254" }), "https://api.lever.co/v0/postings/acme?mode=json&limit=100");
  assert.equal(sourceEndpoint({ id: "3", user_id: "u", name: "C", provider: "ashby", identifier: "acme" }), "https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true");
  assert.equal(htmlToText("<p>A &amp; B</p><li>C</li>"), "A & B\nC");
});

test("Ashby adapter maps public job board postings", async () => {
  const source = { id: "s3", user_id: "u1", name: "Ashby AI", provider: "ashby", identifier: "ashby-ai", filters: { keywords: ["agent"], internships_only: true } };
  const payload = { jobs: [{ id: "a1", title: "AI Agent Intern", location: "Remote", isRemote: true, department: "Engineering", descriptionPlain: "Agent internship with Python and RAG", jobUrl: "https://jobs.ashbyhq.com/ashby-ai/a1", applyUrl: "https://jobs.ashbyhq.com/ashby-ai/a1/application", publishedAt: "2026-08-01T00:00:00Z", isListed: true }] };
  const fetcher = async () => new Response(JSON.stringify(payload), { status: 200 });
  const result = await discoverFromSource(source, fetcher);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].externalId, "a1");
  assert.equal(result.jobs[0].workplace, "remote");
  assert.equal(result.jobs[0].applyUrl, "https://jobs.ashbyhq.com/ashby-ai/a1/application");
});


test("source filtering is broad by default and only restricts to internships when explicitly enabled", () => {
  const job = { title: "Software Engineer", rawText: "Full-time React role", location: "Remote" };
  assert.equal(passesSourceFilters(job, {}), true);
  assert.equal(passesSourceFilters(job, { internships_only: true }), false);
});

test("source filters enforce remote-only work mode", () => {
  const base = { externalId: "remote", company: "A", title: "AI 实习", rawText: "Python 实习", sourceUrl: "https://x", applyUrl: "https://x", location: "", publishedAt: null, deadline: null, salary: "", sourcePayload: {} };
  assert.equal(passesSourceFilters({ ...base, workplace: "remote" }, { work_modes: ["remote"] }), true);
  assert.equal(passesSourceFilters({ ...base, workplace: "hybrid" }, { work_modes: ["remote"] }), false);
  assert.equal(passesSourceFilters({ ...base, workplace: "onsite" }, { work_modes: ["remote"] }), false);
  assert.equal(passesSourceFilters({ ...base, workplace: "unknown" }, { work_modes: ["remote"] }), false);
});
