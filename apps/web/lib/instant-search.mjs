const PLATFORM_DEFINITIONS = Object.freeze({
  workday: { label: "公司官网 / Workday", domains: ["myworkdayjobs.com", "myworkdaysite.com"] },
  boss: { label: "BOSS 直聘", domains: ["zhipin.com"] },
  linkedin: { label: "LinkedIn Jobs", domains: ["linkedin.com"] },
  shixiseng: { label: "实习僧", domains: ["shixiseng.com"] },
  nowcoder: { label: "牛客招聘", domains: ["nowcoder.com"] },
  zhaopin: { label: "智联招聘", domains: ["zhaopin.com"] },
  job51: { label: "前程无忧", domains: ["51job.com"] },
  liepin: { label: "猎聘", domains: ["liepin.com"] },
});

export const INSTANT_SEARCH_PLATFORMS = Object.freeze(Object.keys(PLATFORM_DEFINITIONS));

export const WEB_SEARCH_PLATFORMS = Object.freeze(Object.keys(PLATFORM_DEFINITIONS));

export const LOGIN_WALL_PLATFORMS = Object.freeze(["boss", "nowcoder"]);

function list(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))];
}

function text(value) {
  return String(value ?? "").trim();
}

function safeUrl(value) {
  try {
    const url = new URL(text(value));
    if (!/^https?:$/.test(url.protocol)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function normalizedHost(value) {
  return text(value).toLowerCase().replace(/^www\./, "");
}

function platformFromUrl(value) {
  const url = safeUrl(value);
  if (!url) return "";
  const host = normalizedHost(url.hostname);
  for (const [platform, definition] of Object.entries(PLATFORM_DEFINITIONS)) {
    if (definition.domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return platform;
  }
  return "";
}

function profileParts(profile = {}) {
  const preferences = profile?.preferences && typeof profile.preferences === "object" ? profile.preferences : {};
  const details = profile?.profile_details && typeof profile.profile_details === "object"
    ? profile.profile_details
    : profile?.details && typeof profile.details === "object"
      ? profile.details
      : {};
  return {
    roles: list(preferences.target_roles),
    locations: list(preferences.locations),
    onsiteLocations: list(preferences.onsite_locations),
    workModes: list(preferences.work_modes),
    industries: list(preferences.industries),
    keywords: list(preferences.keywords),
    excluded: list(preferences.excluded_keywords),
    skills: list(details.skills),
    headline: text(details.headline),
    summary: text(details.summary),
    internshipOnly: preferences.internship_only === true,
    graduationYear: profile?.graduation_year == null ? null : Number(profile.graduation_year),
    major: text(profile?.major),
    degree: text(profile?.degree),
  };
}

export function buildProfileSearchSpec(profile = {}, extraQuery = "") {
  const parts = profileParts(profile);
  const extra = text(extraQuery);
  const coreTerms = [...new Set([
    ...parts.roles,
    ...parts.keywords,
    ...parts.skills.slice(0, 6),
    parts.headline,
    parts.major,
    extra,
  ].filter(Boolean))].slice(0, 12);
  const locationTerms = [...new Set([...parts.locations, ...parts.onsiteLocations])].slice(0, 6);
  const queryText = [
    coreTerms.join(" "),
    locationTerms.length ? locationTerms.join(" ") : "",
    parts.internshipOnly ? "实习 intern internship" : "",
  ].filter(Boolean).join(" ").trim();
  return {
    queryText,
    roles: parts.roles,
    locations: [...new Set([...locationTerms, ...parts.onsiteLocations])].slice(0, 6),
    onsiteLocations: parts.onsiteLocations,
    workModes: parts.workModes,
    industries: parts.industries,
    keywords: coreTerms,
    excludedKeywords: parts.excluded,
    internshipOnly: parts.internshipOnly,
    graduationYear: Number.isFinite(parts.graduationYear) ? parts.graduationYear : null,
    major: parts.major,
    degree: parts.degree,
    headline: parts.headline,
    summary: parts.summary.slice(0, 1200),
  };
}

export function searchDomains(platforms = INSTANT_SEARCH_PLATFORMS) {
  return [...new Set(list(platforms).flatMap((platform) => PLATFORM_DEFINITIONS[platform]?.domains ?? []))];
}

export function platformLabel(platform) {
  return PLATFORM_DEFINITIONS[text(platform).toLowerCase()]?.label ?? (text(platform) || "招聘平台");
}

export function platformDefinition(platform) {
  const key = text(platform).toLowerCase();
  const definition = PLATFORM_DEFINITIONS[key];
  return definition ? { id: key, ...definition } : null;
}

function directJobUrl(url, platform) {
  const pathname = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();
  if (platform === "linkedin") return /\/jobs\/view\//.test(pathname);
  if (platform === "boss") return /\/job_detail\//.test(pathname) || /job_detail/.test(search);
  if (platform === "shixiseng") return /\/intern\//.test(pathname) || /\/job\//.test(pathname);
  if (platform === "nowcoder") return /\/jobs\/detail\//.test(pathname) || /\/jobs\/school\//.test(pathname) || /\/jobs\/fulltime\//.test(pathname);
  if (platform === "zhaopin") return /\/jobdetail\//.test(pathname) || /position\//.test(pathname) || /\/jobs\//.test(pathname);
  if (platform === "job51") return /jobdetail/.test(pathname) || /\/job\//.test(pathname) || /job\.html$/.test(pathname);
  if (platform === "liepin") return /\/job\//.test(pathname) || /jobdetail/.test(pathname) || /\/zpaicp/.test(pathname);
  if (platform === "workday") return /\/job\//.test(pathname) || /\/job\//.test(search) || /job\//.test(pathname);
  return pathname.length > 1;
}

export function normalizeIndexedJob(input = {}, expectedPlatform = "") {
  const sourceUrl = safeUrl(input.source_url ?? input.apply_url ?? input.url);
  if (!sourceUrl) return null;
  const detectedPlatform = platformFromUrl(sourceUrl.toString());
  const requested = text(expectedPlatform || input.platform).toLowerCase();
  const platform = detectedPlatform || requested;
  if (!platform || !PLATFORM_DEFINITIONS[platform]) return null;
  if (requested && requested !== platform) return null;
  if (!directJobUrl(sourceUrl, platform)) return null;
  const title = text(input.title).slice(0, 240);
  const company = text(input.company).slice(0, 180);
  if (!title) return null;
  const applyUrl = safeUrl(input.apply_url)?.toString() || sourceUrl.toString();
  const location = text(input.location).slice(0, 240);
  const description = text(input.description ?? input.summary ?? input.raw_text).slice(0, 12000);
  const rawText = [title, company, location, description].filter(Boolean).join("\n");
  return {
    platform,
    platformLabel: platformLabel(platform),
    company: company || platformLabel(platform),
    title,
    location,
    workplace: ["remote", "hybrid", "onsite", "unknown"].includes(text(input.workplace).toLowerCase()) ? text(input.workplace).toLowerCase() : "unknown",
    salary: text(input.salary).slice(0, 240),
    publishedAt: text(input.published_at).slice(0, 40) || null,
    deadline: text(input.deadline).slice(0, 40) || null,
    sourceUrl: sourceUrl.toString(),
    applyUrl,
    rawText,
    sourcePayload: input,
  };
}

function parseFreshnessDate(value, endOfDay = false) {
  const raw = text(value);
  if (!raw) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const parsed = Date.parse(dateOnly && endOfDay ? `${raw}T23:59:59.999Z` : raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Deterministic freshness guard for indexed jobs. Unknown dates remain visible
 * but are marked for re-check instead of being treated as current.
 */
export function jobFreshnessStatus(job = {}, now = new Date()) {
  const current = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const checkedAt = Number.isFinite(current) ? current : Date.now();
  const deadline = parseFreshnessDate(job.deadline ?? job.deadline_at, true);
  if (deadline != null) return deadline < checkedAt ? "stale" : "fresh";
  const published = parseFreshnessDate(job.publishedAt ?? job.published_at);
  if (published == null) return "unknown";
  const ageDays = (checkedAt - published) / 86400000;
  if (ageDays > 45) return "stale";
  return ageDays >= -1 ? "fresh" : "unknown";
}

export function buildSearchReviewNotification(results = [], runId = "") {
  const reviewRows = (Array.isArray(results) ? results : []).filter((row) => {
    const snapshot = row?.result_snapshot && typeof row.result_snapshot === "object" ? row.result_snapshot : {};
    return snapshot.freshness_status === "unknown" || row?.needs_confirmation === true;
  });
  if (!reviewRows.length) return null;
  const sample = reviewRows.slice(0, 3).map((row) => {
    const snapshot = row.result_snapshot && typeof row.result_snapshot === "object" ? row.result_snapshot : {};
    return [snapshot.company_name, snapshot.title].filter(Boolean).join(" · ");
  }).filter(Boolean).join("；");
  return {
    type: "profile_search_review",
    title: `搜索完成：${reviewRows.length} 个岗位需要复核`,
    body: `系统已完成岗位匹配与资格初筛，但仍有岗位缺少可验证的发布时间或关键条件。请打开岗位报告复核后再决定是否投递。${sample ? ` 示例：${sample}` : ""}`,
    action_url: "/jobs",
    metadata: {
      search_run_id: runId || null,
      review_required_count: reviewRows.length,
      job_ids: reviewRows.map((row) => String(row.job_id ?? "")).filter(Boolean).slice(0, 20),
    },
  };
}

function identity(job) {
  const url = safeUrl(job?.sourceUrl ?? job?.source_url)?.toString().replace(/\/$/, "").toLowerCase();
  if (url) return url;
  return `${text(job?.company).toLowerCase()}|${text(job?.title).toLowerCase()}|${text(job?.location).toLowerCase()}`;
}

export function deduplicateIndexedJobs(jobs = []) {
  const seen = new Set();
  const result = [];
  for (const job of jobs) {
    const key = identity(job);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(job);
  }
  return result;
}

export function extractResponseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (item?.type !== "message") continue;
    for (const content of Array.isArray(item.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

function responseSchema(platforms) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["platform_reports", "jobs"],
    properties: {
      platform_reports: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["platform", "status", "searched_queries", "result_count", "note"],
          properties: {
            platform: { type: "string", enum: platforms },
            status: { type: "string", enum: ["success", "no_results", "unavailable"] },
            searched_queries: { type: "array", items: { type: "string" } },
            result_count: { type: "integer" },
            note: { type: "string" },
          },
        },
      },
      jobs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["platform", "company", "title", "location", "workplace", "salary", "published_at", "description", "source_url", "apply_url"],
          properties: {
            platform: { type: "string", enum: platforms },
            company: { type: "string" },
            title: { type: "string" },
            location: { type: "string" },
            workplace: { type: "string", enum: ["remote", "hybrid", "onsite", "unknown"] },
            salary: { type: "string" },
            published_at: { type: "string" },
            deadline: { type: "string" },
            description: { type: "string" },
            source_url: { type: "string" },
            apply_url: { type: "string" },
          },
        },
      },
    },
  };
}

function promptForSearch(spec, platforms, maxResults) {
  const platformLines = platforms.map((platform) => `- ${platform}: ${platformLabel(platform)} (${(PLATFORM_DEFINITIONS[platform]?.domains ?? []).join(", ")})`).join("\n");
  return [
    "为求职者执行一次即时岗位聚合搜索。必须逐个平台分别搜索，不是只生成搜索链接。",
    "只返回公开网页索引中能够核验的真实岗位详情页或真实申请页；不要返回搜索结果页、首页、公司介绍页、新闻、培训广告或聚合文章。",
    "不要猜测岗位、公司、薪资、发布时间或链接。无法核验时，该平台标为 no_results 或 unavailable。",
    "优先最近 45 天内仍开放、与画像相关的岗位；允许实习、校招或社招，具体按画像。",
    `每个平台最多返回 ${Math.max(1, Math.min(10, Math.ceil(maxResults / Math.max(1, platforms.length))))} 个，总计最多 ${maxResults} 个。`,
    "每个平台都必须在 platform_reports 中出现一次。",
    "平台列表：",
    platformLines,
    "画像搜索条件：",
    JSON.stringify(spec),
  ].join("\n");
}

export async function searchPublicJobIndex({ profile, extraQuery = "", platforms = INSTANT_SEARCH_PLATFORMS, apiKey, model = "gpt-5-mini", maxResults = 40, fetcher = fetch }) {
  const requested = list(platforms).map((item) => item.toLowerCase()).filter((item) => PLATFORM_DEFINITIONS[item]);
  const spec = buildProfileSearchSpec(profile, extraQuery);
  if (!requested.length) return { jobs: [], platformReports: [], querySpec: spec, provider: "none" };
  if (!text(apiKey)) {
    return {
      jobs: [],
      platformReports: requested.map((platform) => ({ platform, status: "unavailable", searched_queries: [], result_count: 0, note: "OPENAI_API_KEY 未配置，无法执行公开网页索引搜索" })),
      querySpec: spec,
      provider: "openai_web_search",
    };
  }
  const response = await fetcher("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${text(apiKey)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      tools: [{ type: "web_search", search_context_size: "high", filters: { allowed_domains: searchDomains(requested) } }],
      input: promptForSearch(spec, requested, maxResults),
      text: {
        format: {
          type: "json_schema",
          name: "career_job_search",
          strict: true,
          schema: responseSchema(requested),
        },
      },
      max_output_tokens: 7000,
    }),
    signal: AbortSignal.timeout(90000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = text(payload?.error?.message) || `公开网页搜索返回 HTTP ${response.status}`;
    throw new Error(message);
  }
  const outputText = extractResponseText(payload);
  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("公开网页搜索没有返回可解析的结构化岗位结果");
  }
  const normalizedJobs = deduplicateIndexedJobs((Array.isArray(parsed?.jobs) ? parsed.jobs : [])
    .map((job) => normalizeIndexedJob(job, job?.platform))
    .filter(Boolean))
    .slice(0, Math.max(1, Math.min(100, Number(maxResults) || 40)));
  const counts = new Map();
  for (const job of normalizedJobs) counts.set(job.platform, (counts.get(job.platform) ?? 0) + 1);
  const reportByPlatform = new Map((Array.isArray(parsed?.platform_reports) ? parsed.platform_reports : []).map((report) => [text(report?.platform).toLowerCase(), report]));
  const platformReports = requested.map((platform) => {
    const report = reportByPlatform.get(platform) ?? {};
    const resultCount = counts.get(platform) ?? 0;
    return {
      platform,
      status: resultCount > 0 ? "success" : ["unavailable", "no_results"].includes(report.status) ? report.status : "no_results",
      searched_queries: list(report.searched_queries).slice(0, 12),
      result_count: resultCount,
      note: text(report.note).slice(0, 500),
    };
  });
  return { jobs: normalizedJobs, platformReports, querySpec: spec, provider: "openai_web_search", responseId: text(payload?.id) || null };
}

export async function searchPublicJobIndexWithTavily({ profile, extraQuery = "", platforms = WEB_SEARCH_PLATFORMS, apiKey, maxResults = 15, fetcher = fetch }) {
  const requested = list(platforms).map((item) => item.toLowerCase()).filter((item) => PLATFORM_DEFINITIONS[item]);
  const spec = buildProfileSearchSpec(profile, extraQuery);
  if (!requested.length) return { jobs: [], platformReports: [], querySpec: spec, provider: "none" };
  if (!text(apiKey)) {
    return {
      jobs: [],
      platformReports: requested.map((platform) => ({ platform, status: "unavailable", searched_queries: [], result_count: 0, note: "TAVILY_API_KEY 未配置，无法执行免费网页索引搜索" })),
      querySpec: spec,
      provider: "tavily",
    };
  }
  const focusTerms = [...new Set([
    ...(spec.roles ?? []),
    ...list(spec.keywords).slice(0, 2),
    ...(spec.roles ?? []).length ? [] : [spec.headline],
    text(extraQuery),
  ].filter(Boolean))].slice(0, 6);
  const baseQuery = [
    focusTerms.join(" "),
    spec.locations.length ? spec.locations.slice(0, 2).join(" ") : "",
    spec.internshipOnly ? "实习 intern" : "",
  ].filter(Boolean).join(" ").trim() || "AI 产品 实习 岗位";
  const perPlatform = Math.max(2, Math.min(4, Math.ceil(Number(maxResults) / Math.max(1, requested.length))));
  const allJobs = [];
  const reportByPlatform = new Map();
  for (const platform of requested) {
    const domains = PLATFORM_DEFINITIONS[platform]?.domains ?? [];
    const platformJobs = [];
    if (LOGIN_WALL_PLATFORMS.includes(platform)) {
      reportByPlatform.set(platform, { platform, status: "no_results", searched_queries: [], result_count: 0, note: "该平台岗位需登录才能查看，搜索引擎无法收录。请先在浏览器登录该平台账号，再在平台上搜索岗位并复制链接/JD 导入。" });
      continue;
    }
    try {
      const response = await fetcher("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: text(apiKey),
          query: baseQuery.slice(0, 300) || "岗位 实习",
          search_depth: "advanced",
          max_results: perPlatform * 3,
          include_domains: domains,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(45000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(text(payload?.error) || `Tavily 返回 ${response.status}`);
      const results = Array.isArray(payload?.results) ? payload.results : [];
      for (const item of results) {
        const job = normalizeIndexedJob({
          source_url: item?.url,
          apply_url: item?.url,
          title: item?.title,
          company: "",
          location: "",
          description: item?.content,
        }, platform);
        if (job && job.platform === platform) platformJobs.push(job);
        if (platformJobs.length >= perPlatform) break;
      }
      allJobs.push(...platformJobs);
      reportByPlatform.set(platform, { platform, status: platformJobs.length ? "success" : "no_results", searched_queries: [baseQuery.slice(0, 200)], result_count: platformJobs.length, note: "" });
    } catch (error) {
      reportByPlatform.set(platform, { platform, status: "failed", searched_queries: [], result_count: 0, note: error instanceof Error ? error.message : "搜索失败" });
    }
  }
  const normalizedJobs = deduplicateIndexedJobs(allJobs).slice(0, Math.max(1, Math.min(100, Number(maxResults) || 15)));
  const platformReports = requested.map((platform) => reportByPlatform.get(platform) ?? {
    platform,
    status: "no_results",
    searched_queries: [],
    result_count: 0,
    note: "",
  });
  return { jobs: normalizedJobs, platformReports, querySpec: spec, provider: "tavily" };
}
