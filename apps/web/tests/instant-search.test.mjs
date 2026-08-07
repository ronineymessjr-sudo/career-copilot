import assert from "node:assert/strict";
import test from "node:test";
import {
  INSTANT_SEARCH_PLATFORMS,
  buildProfileSearchSpec,
  normalizeIndexedJob,
  searchDomains,
  searchPublicJobIndex,
} from "../lib/instant-search.mjs";

test("profile-driven instant search combines role, skills, location, and the user's extra query", () => {
  const spec = buildProfileSearchSpec({
    major: "计算机科学",
    preferences: {
      target_roles: ["AI 产品经理"],
      locations: ["上海"],
      keywords: ["Agent"],
      excluded_keywords: ["销售"],
      internship_only: true,
    },
    profile_details: {
      headline: "AI 产品与智能体方向",
      skills: ["Python", "RAG"],
    },
  }, "大模型应用");
  assert.match(spec.queryText, /AI 产品经理/);
  assert.match(spec.queryText, /Python/);
  assert.match(spec.queryText, /上海/);
  assert.match(spec.queryText, /大模型应用/);
  assert.equal(spec.internshipOnly, true);
  assert.deepEqual(spec.excludedKeywords, ["销售"]);
});

test("instant search covers every supported recruitment platform domain", () => {
  const domains = searchDomains(INSTANT_SEARCH_PLATFORMS);
  for (const expected of ["myworkdayjobs.com", "zhipin.com", "linkedin.com", "shixiseng.com", "nowcoder.com", "zhaopin.com", "51job.com", "liepin.com"]) {
    assert.ok(domains.includes(expected), `missing ${expected}`);
  }
});

test("indexed search accepts real job-detail pages and rejects search-result pages", () => {
  const real = normalizeIndexedJob({
    platform: "linkedin",
    company: "Example AI",
    title: "AI Product Intern",
    location: "Shanghai",
    workplace: "hybrid",
    salary: "",
    published_at: "2026-08-01",
    description: "Build AI products.",
    source_url: "https://www.linkedin.com/jobs/view/1234567890/",
    apply_url: "https://www.linkedin.com/jobs/view/1234567890/",
  }, "linkedin");
  assert.equal(real?.platform, "linkedin");
  assert.match(real?.sourceUrl ?? "", /jobs\/view/);

  const searchPage = normalizeIndexedJob({
    platform: "linkedin",
    company: "Example AI",
    title: "Search results",
    source_url: "https://www.linkedin.com/jobs/search/?keywords=AI",
    apply_url: "https://www.linkedin.com/jobs/search/?keywords=AI",
  }, "linkedin");
  assert.equal(searchPage, null);
});

test("public indexed search requests web search with domain filters and returns normalized jobs", async () => {
  let requestBody = null;
  const result = await searchPublicJobIndex({
    profile: { preferences: { target_roles: ["AI 工程师"], locations: ["北京"] }, profile_details: { skills: ["Python"] } },
    platforms: ["linkedin", "boss"],
    apiKey: "test-key",
    maxResults: 6,
    fetcher: async (_url, init) => {
      requestBody = JSON.parse(init.body);
      return new Response(JSON.stringify({
        id: "resp_test",
        output_text: JSON.stringify({
          platform_reports: [
            { platform: "linkedin", status: "success", searched_queries: ["AI 工程师 北京"], result_count: 1, note: "找到公开岗位" },
            { platform: "boss", status: "no_results", searched_queries: ["AI 工程师 北京"], result_count: 0, note: "暂无可核验结果" },
          ],
          jobs: [
            {
              platform: "linkedin",
              company: "Example AI",
              title: "AI Engineer",
              location: "Beijing",
              workplace: "onsite",
              salary: "",
              published_at: "2026-08-01",
              description: "Python and agent systems",
              source_url: "https://www.linkedin.com/jobs/view/1234567890/",
              apply_url: "https://www.linkedin.com/jobs/view/1234567890/",
            },
            {
              platform: "linkedin",
              company: "Bad Search Page",
              title: "Search",
              location: "",
              workplace: "unknown",
              salary: "",
              published_at: "",
              description: "",
              source_url: "https://www.linkedin.com/jobs/search/?keywords=AI",
              apply_url: "https://www.linkedin.com/jobs/search/?keywords=AI",
            },
          ],
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.equal(requestBody.tools[0].type, "web_search");
  assert.deepEqual(requestBody.tools[0].filters.allowed_domains.sort(), ["linkedin.com", "zhipin.com"]);
  assert.equal(requestBody.text.format.type, "json_schema");
  assert.equal(requestBody.text.format.strict, true);
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].platform, "linkedin");
  assert.equal(result.platformReports.find((item) => item.platform === "linkedin")?.result_count, 1);
});

test("missing search API key reports each platform as unavailable without fabricating jobs", async () => {
  const result = await searchPublicJobIndex({ profile: {}, platforms: ["boss", "zhaopin"], apiKey: "" });
  assert.equal(result.jobs.length, 0);
  assert.deepEqual(result.platformReports.map((item) => item.platform), ["boss", "zhaopin"]);
  assert.ok(result.platformReports.every((item) => item.status === "unavailable"));
});
