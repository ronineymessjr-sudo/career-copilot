function text(value) {
    return typeof value === "string" ? value.trim() : "";
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
    if (!value)
        return null;
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}
function normalizeWorkplace(value) {
    const normalized = text(value).toLowerCase();
    if (["remote", "远程"].includes(normalized))
        return "remote";
    if (["hybrid", "混合", "部分远程"].includes(normalized))
        return "hybrid";
    if (["on-site", "onsite", "on site", "现场", "线下"].includes(normalized))
        return "onsite";
    return "unknown";
}
function formatSalary(range, description) {
    const explicit = htmlToText(description);
    if (explicit)
        return explicit;
    if (!range || typeof range !== "object")
        return "";
    const item = range;
    const min = typeof item.min === "number" ? item.min : null;
    const max = typeof item.max === "number" ? item.max : null;
    const currency = text(item.currency);
    const interval = text(item.interval);
    if (min == null && max == null)
        return "";
    const span = min != null && max != null ? `${min}-${max}` : String(min ?? max);
    return [span, currency, interval].filter(Boolean).join(" ");
}
export function sourceEndpoint(source) {
    const id = encodeURIComponent(source.identifier.trim());
    if (source.provider === "greenhouse") {
        return `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    }
    return `https://api.lever.co/v0/postings/${id}?mode=json&limit=100`;
}
function greenhouseJobs(source, payload) {
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
    return jobs.flatMap((raw) => {
        if (!raw || typeof raw !== "object")
            return [];
        const item = raw;
        const title = text(item.title);
        const url = text(item.absolute_url);
        if (!title || !url || item.id == null)
            return [];
        const location = text(item.location?.name);
        const content = htmlToText(item.content);
        const departments = Array.isArray(item.departments) ? item.departments.map((entry) => text(entry?.name)).filter(Boolean) : [];
        const offices = Array.isArray(item.offices) ? item.offices.map((entry) => text(entry?.name || entry?.location)).filter(Boolean) : [];
        const rawText = [title, location, content, departments.length ? `部门：${departments.join("、")}` : "", offices.length ? `办公地点：${offices.join("、")}` : ""]
            .filter(Boolean)
            .join("\n");
        return [{
                externalId: String(item.id),
                company: source.name,
                title,
                rawText,
                sourceUrl: url,
                applyUrl: url,
                location,
                workplace: normalizeWorkplace(location.toLowerCase().includes("remote") ? "remote" : "unknown"),
                publishedAt: normalizeDate(item.first_published ?? item.updated_at),
                deadline: normalizeDate(item.application_deadline),
                salary: "",
                sourcePayload: item,
            }];
    });
}
function leverJobs(source, payload) {
    const jobs = Array.isArray(payload) ? payload : [];
    return jobs.flatMap((raw) => {
        if (!raw || typeof raw !== "object")
            return [];
        const item = raw;
        const title = text(item.text);
        const hostedUrl = text(item.hostedUrl);
        const applyUrl = text(item.applyUrl) || hostedUrl;
        if (!title || !hostedUrl || !item.id)
            return [];
        const categories = item.categories && typeof item.categories === "object" ? item.categories : {};
        const location = text(categories.location) || (Array.isArray(categories.allLocations) ? categories.allLocations.map(text).filter(Boolean).join(" / ") : "");
        const lists = Array.isArray(item.lists)
            ? item.lists.map((entry) => `${text(entry?.text)}\n${htmlToText(entry?.content)}`).filter(Boolean)
            : [];
        const rawText = [
            title,
            location,
            text(categories.commitment),
            text(item.descriptionPlain) || htmlToText(item.description),
            ...lists,
            text(item.additionalPlain) || htmlToText(item.additional),
        ].filter(Boolean).join("\n");
        return [{
                externalId: String(item.id),
                company: source.name,
                title,
                rawText,
                sourceUrl: hostedUrl,
                applyUrl,
                location,
                workplace: normalizeWorkplace(item.workplaceType),
                publishedAt: normalizeDate(item.createdAt),
                deadline: null,
                salary: formatSalary(item.salaryRange, item.salaryDescriptionPlain || item.salaryDescription),
                sourcePayload: item,
            }];
    });
}
function stringList(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => text(item).toLowerCase()).filter(Boolean);
}
export function passesSourceFilters(job, filters) {
    const config = filters ?? {};
    const haystack = `${job.title}\n${job.rawText}\n${job.location}`.toLowerCase();
    const keywords = stringList(config.keywords);
    const exclude = stringList(config.exclude_keywords);
    const locations = stringList(config.locations);
    if (keywords.length && !keywords.some((item) => haystack.includes(item)))
        return false;
    if (exclude.some((item) => haystack.includes(item)))
        return false;
    if (locations.length && !locations.some((item) => haystack.includes(item)))
        return false;
    if (config.internships_only !== false && !/(实习|intern|internship)/i.test(haystack))
        return false;
    return true;
}
export async function discoverFromSource(source, fetcher = fetch) {
    const endpoint = sourceEndpoint(source);
    const response = await fetcher(endpoint, {
        headers: { accept: "application/json", "user-agent": "Career-Copilot-V2/0.7" },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
    });
    if (!response.ok)
        throw new Error(`${source.provider} source returned HTTP ${response.status}`);
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > 5_000_000)
        throw new Error(`${source.provider} source response is too large`);
    const payload = await response.json();
    const parsed = source.provider === "greenhouse" ? greenhouseJobs(source, payload) : leverJobs(source, payload);
    const maxJobs = Math.max(1, Math.min(200, Number(source.filters?.max_jobs ?? 100)));
    const jobs = parsed.filter((job) => passesSourceFilters(job, source.filters)).slice(0, maxJobs);
    return { endpoint, seen: parsed.length, jobs };
}
