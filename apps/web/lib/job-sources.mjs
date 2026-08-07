const AUTOMATED_PROVIDERS = new Set(["greenhouse", "lever", "ashby"]);

const PROVIDER_DEFINITIONS = Object.freeze({
  greenhouse: {
    name: "Greenhouse",
    mode: "api",
    homepage: "https://www.greenhouse.com/",
  },
  lever: {
    name: "Lever",
    mode: "api",
    homepage: "https://www.lever.co/",
  },
  ashby: {
    name: "Ashby",
    mode: "api",
    homepage: "https://www.ashbyhq.com/",
  },
  workday: {
    name: "公司官网 / Workday",
    mode: "search",
    homepage: "https://www.myworkdayjobs.com/",
  },
  boss: {
    name: "BOSS 直聘",
    mode: "search",
    homepage: "https://www.zhipin.com/zhaopin/",
  },
  linkedin: {
    name: "LinkedIn Jobs",
    mode: "search",
    homepage: "https://www.linkedin.com/jobs/search/",
  },
  shixiseng: {
    name: "实习僧",
    mode: "search",
    homepage: "https://www.shixiseng.com/interns?type=intern",
  },
  nowcoder: {
    name: "牛客招聘",
    mode: "search",
    homepage: "https://www.nowcoder.com/jobs/fulltime/center",
  },
  zhaopin: {
    name: "智联招聘",
    mode: "search",
    homepage: "https://www.zhaopin.com/sou/positionlist",
  },
  job51: {
    name: "前程无忧",
    mode: "search",
    homepage: "https://we.51job.com/pc/search",
  },
  liepin: {
    name: "猎聘",
    mode: "search",
    homepage: "https://www.liepin.com/zhaopin/",
  },
});

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeUrl(value) {
  try {
    const url = new URL(text(value));
    if (!/^https?:$/.test(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

export function htmlToText(value) {
  return decodeEntities(text(value))
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

function normalizeWorkplace(value) {
  const normalized = text(value).toLowerCase();
  if (["remote", "远程"].includes(normalized)) return "remote";
  if (["hybrid", "混合", "部分远程"].includes(normalized)) return "hybrid";
  if (["on-site", "onsite", "on site", "现场", "线下"].includes(normalized)) return "onsite";
  return "unknown";
}

function formatSalary(range, description) {
  const explicit = htmlToText(description);
  if (explicit) return explicit;
  if (!range || typeof range !== "object") return "";
  const min = typeof range.min === "number" ? range.min : null;
  const max = typeof range.max === "number" ? range.max : null;
  if (min == null && max == null) return "";
  const span = min != null && max != null ? `${min}-${max}` : String(min ?? max);
  return [span, text(range.currency), text(range.interval)].filter(Boolean).join(" ");
}

export function providerDefinition(provider) {
  return PROVIDER_DEFINITIONS[text(provider).toLowerCase()] ?? null;
}

export function isAutomatedProvider(provider) {
  return AUTOMATED_PROVIDERS.has(text(provider).toLowerCase());
}

function simpleIdentifier(input) {
  const value = text(input);
  return /^[A-Za-z0-9._-]{2,100}$/.test(value) ? value : "";
}

function identifierFromUrl(provider, url) {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean).map((item) => decodeURIComponent(item));
  if (provider === "greenhouse") {
    const boardIndex = parts.findIndex((part) => part === "boards");
    if (host.includes("boards-api.greenhouse.io") && boardIndex >= 0) return parts[boardIndex + 1] ?? "";
    if (host.includes("greenhouse.io")) return parts[0] ?? "";
  }
  if (provider === "lever") {
    const postingsIndex = parts.findIndex((part) => part === "postings");
    if (host.includes("api.lever.co") && postingsIndex >= 0) return parts[postingsIndex + 1] ?? "";
    if (host.includes("lever.co")) return parts[0] ?? "";
  }
  if (provider === "ashby") {
    const boardIndex = parts.findIndex((part) => part === "job-board");
    if (host.includes("api.ashbyhq.com") && boardIndex >= 0) return parts[boardIndex + 1] ?? "";
    if (host.includes("ashbyhq.com")) return parts[0] ?? "";
  }
  return "";
}

function canonicalPublicPage(provider, identifier, inputUrl) {
  if (inputUrl) {
    const clean = new URL(inputUrl.toString());
    clean.hash = "";
    return clean.toString();
  }
  if (provider === "greenhouse") return `https://boards.greenhouse.io/${encodeURIComponent(identifier)}`;
  if (provider === "lever") return `https://jobs.lever.co/${encodeURIComponent(identifier)}`;
  if (provider === "ashby") return `https://jobs.ashbyhq.com/${encodeURIComponent(identifier)}`;
  return providerDefinition(provider)?.homepage ?? "";
}

export function normalizeSourceInput(providerValue, inputValue = "") {
  const provider = text(providerValue).toLowerCase();
  const definition = providerDefinition(provider);
  if (!definition) throw new Error("不支持的招聘来源");
  const inputUrl = safeUrl(inputValue);
  if (definition.mode === "api") {
    const identifier = inputUrl ? identifierFromUrl(provider, inputUrl) : simpleIdentifier(inputValue);
    if (!identifier) {
      throw new Error("请粘贴完整公司招聘页网址，或填写有效的站点标识");
    }
    return {
      provider,
      identifier,
      sourceUrl: canonicalPublicPage(provider, identifier, inputUrl),
      connectionMode: "api",
    };
  }
  const sourceUrl = inputUrl?.toString() || definition.homepage;
  const identifier = provider === "workday" && inputUrl
    ? `${inputUrl.hostname}${inputUrl.pathname}`.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "workday"
    : provider;
  return { provider, identifier, sourceUrl, connectionMode: "search" };
}

function firstListValue(value) {
  return Array.isArray(value) ? text(value.find((item) => text(item))) : "";
}

export function portalSearchUrl(sourceOrProvider, filters = {}) {
  const source = typeof sourceOrProvider === "string" ? { provider: sourceOrProvider } : (sourceOrProvider ?? {});
  const provider = text(source.provider).toLowerCase();
  const definition = providerDefinition(provider);
  if (!definition) return "";
  const configured = safeUrl(source.source_url)?.toString();
  const base = configured || definition.homepage;
  if (provider !== "linkedin") return base;
  const url = new URL(base);
  const keywords = firstListValue(filters.keywords ?? source.filters?.keywords);
  const location = firstListValue(filters.locations ?? source.filters?.locations);
  if (keywords) url.searchParams.set("keywords", keywords);
  if (location) url.searchParams.set("location", location);
  return url.toString();
}

export function sourceEndpoint(source) {
  const provider = text(source.provider).toLowerCase();
  if (!isAutomatedProvider(provider)) throw new Error(`${providerDefinition(provider)?.name ?? provider} 是平台搜索入口，不支持后台自动抓取`);
  const id = encodeURIComponent(text(source.identifier));
  if (!id) throw new Error("岗位来源缺少站点标识");
  if (provider === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
  if (provider === "ashby") return `https://api.ashbyhq.com/posting-api/job-board/${id}?includeCompensation=true`;
  const sourceUrl = safeUrl(source.source_url);
  const eu = sourceUrl?.hostname.toLowerCase().includes("eu.lever.co");
  return `https://api${eu ? ".eu" : ""}.lever.co/v0/postings/${id}?mode=json&limit=100`;
}

function greenhouseJobs(source, payload) {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return jobs.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const title = text(raw.title);
    const url = text(raw.absolute_url);
    if (!title || !url || raw.id == null) return [];
    const location = text(raw.location?.name);
    const departments = Array.isArray(raw.departments) ? raw.departments.map((entry) => text(entry?.name)).filter(Boolean) : [];
    const offices = Array.isArray(raw.offices) ? raw.offices.map((entry) => text(entry?.name || entry?.location)).filter(Boolean) : [];
    const rawText = [title, location, htmlToText(raw.content), departments.length ? `部门：${departments.join("、")}` : "", offices.length ? `办公地点：${offices.join("、")}` : ""].filter(Boolean).join("\n");
    return [{
      externalId: String(raw.id), company: source.name, title, rawText, sourceUrl: url, applyUrl: url, location,
      workplace: normalizeWorkplace(location.toLowerCase().includes("remote") ? "remote" : "unknown"),
      publishedAt: normalizeDate(raw.first_published ?? raw.updated_at), deadline: normalizeDate(raw.application_deadline), salary: "", sourcePayload: raw,
    }];
  });
}

function leverJobs(source, payload) {
  const jobs = Array.isArray(payload) ? payload : [];
  return jobs.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const title = text(raw.text);
    const hostedUrl = text(raw.hostedUrl);
    const applyUrl = text(raw.applyUrl) || hostedUrl;
    if (!title || !hostedUrl || !raw.id) return [];
    const categories = raw.categories && typeof raw.categories === "object" ? raw.categories : {};
    const location = text(categories.location) || (Array.isArray(categories.allLocations) ? categories.allLocations.map(text).filter(Boolean).join(" / ") : "");
    const lists = Array.isArray(raw.lists) ? raw.lists.map((entry) => `${text(entry?.text)}\n${htmlToText(entry?.content)}`).filter(Boolean) : [];
    const rawText = [title, location, text(categories.commitment), text(raw.descriptionPlain) || htmlToText(raw.description), ...lists, text(raw.additionalPlain) || htmlToText(raw.additional)].filter(Boolean).join("\n");
    return [{
      externalId: String(raw.id), company: source.name, title, rawText, sourceUrl: hostedUrl, applyUrl, location,
      workplace: normalizeWorkplace(raw.workplaceType), publishedAt: normalizeDate(raw.createdAt), deadline: null,
      salary: formatSalary(raw.salaryRange, raw.salaryDescriptionPlain || raw.salaryDescription), sourcePayload: raw,
    }];
  });
}

function lowerLocation(value) {
  return String(value ?? "").toLowerCase();
}

function ashbyJobs(source, payload) {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
  return jobs.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || raw.isListed === false) return [];
    const title = text(raw.title);
    const sourceUrl = text(raw.jobUrl || raw.hostedUrl || raw.applyUrl);
    const applyUrl = text(raw.applyUrl) || sourceUrl;
    const externalId = text(raw.id || raw.jobPostingId || sourceUrl);
    if (!title || !sourceUrl || !externalId) return [];
    const secondaryLocations = Array.isArray(raw.secondaryLocations) ? raw.secondaryLocations.map((entry) => text(entry?.location)).filter(Boolean) : [];
    const location = [text(raw.location), ...secondaryLocations].filter(Boolean).join(" / ");
    const compensation = raw.compensation && typeof raw.compensation === "object"
      ? [text(raw.compensation.compensationTierSummary), text(raw.compensation.scrapeableCompensationSalarySummary)].filter(Boolean).join(" · ")
      : "";
    const rawText = [title, location, text(raw.department), text(raw.team), text(raw.employmentType), text(raw.descriptionPlain) || htmlToText(raw.descriptionHtml || raw.description), compensation].filter(Boolean).join("\n");
    return [{
      externalId, company: source.name, title, rawText, sourceUrl, applyUrl, location,
      workplace: raw.isRemote === true ? "remote" : normalizeWorkplace(raw.workplaceType || (lowerLocation(location).includes("remote") ? "remote" : "unknown")),
      publishedAt: normalizeDate(raw.publishedAt || raw.updatedAt), deadline: normalizeDate(raw.applicationDeadline), salary: compensation, sourcePayload: raw,
    }];
  });
}

function parseProviderJobs(source, payload) {
  if (source.provider === "greenhouse") return greenhouseJobs(source, payload);
  if (source.provider === "ashby") return ashbyJobs(source, payload);
  return leverJobs(source, payload);
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item).toLowerCase()).filter(Boolean);
}

export function passesSourceFilters(job, filters) {
  const config = filters ?? {};
  const haystack = `${job.title}\n${job.rawText}\n${job.location}`.toLowerCase();
  const keywords = stringList(config.keywords);
  const exclude = stringList(config.exclude_keywords);
  const locations = stringList(config.locations);
  if (keywords.length && !keywords.some((item) => haystack.includes(item))) return false;
  if (exclude.some((item) => haystack.includes(item))) return false;
  if (locations.length && !locations.some((item) => haystack.includes(item))) return false;
  if (config.internships_only === true && !/(实习|intern|internship)/i.test(haystack)) return false;
  return true;
}

async function fetchSourcePayload(source, fetcher) {
  const endpoint = sourceEndpoint(source);
  const response = await fetcher(endpoint, {
    headers: { accept: "application/json", "user-agent": "Career-Copilot-V2/2.0.2" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${providerDefinition(source.provider)?.name ?? source.provider} 返回 HTTP ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 5_000_000) throw new Error("岗位来源响应过大");
  const body = await response.text();
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("招聘页没有返回可读取的 JSON，请检查公司招聘页或站点标识");
  }
  return { endpoint, payload };
}

export async function testSourceConnection(source, fetcher = fetch) {
  if (!isAutomatedProvider(source.provider)) {
    const searchUrl = portalSearchUrl(source, source.filters ?? {});
    if (!searchUrl) throw new Error("平台搜索地址无效");
    return { mode: "search", endpoint: searchUrl, seen: null, ok: true };
  }
  const { endpoint, payload } = await fetchSourcePayload(source, fetcher);
  const parsed = parseProviderJobs(source, payload);
  return { mode: "api", endpoint, seen: parsed.length, ok: true };
}

export async function discoverFromSource(source, fetcher = fetch) {
  if (!isAutomatedProvider(source.provider)) {
    return { endpoint: portalSearchUrl(source, source.filters ?? {}), seen: 0, jobs: [], mode: "search" };
  }
  const { endpoint, payload } = await fetchSourcePayload(source, fetcher);
  const parsed = parseProviderJobs(source, payload);
  const maxJobs = Math.max(1, Math.min(200, Number(source.filters?.max_jobs ?? 100)));
  const jobs = parsed.filter((job) => passesSourceFilters(job, source.filters)).slice(0, maxJobs);
  return { endpoint, seen: parsed.length, jobs, mode: "api" };
}
