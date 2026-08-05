const OVERRIDE_FIELDS = Object.freeze([
  "accepts_students",
  "accepts_2028",
  "days_per_week",
  "minimum_months",
  "graduation_requirement",
  "workplace",
  "city",
  "district",
  "address",
  "salary",
  "deadline",
]);

function verifiedFields(override) {
  return new Set(Array.isArray(override?.verified_fields) ? override.verified_fields.map(String) : []);
}

export function mergeJobOverride(job = {}, override = null) {
  if (!override) return { ...job, user_override: null };
  const verified = verifiedFields(override);
  const merged = { ...job };
  for (const field of OVERRIDE_FIELDS) {
    if (verified.has(field)) merged[field] = override[field] ?? null;
  }
  return {
    ...merged,
    user_override: override,
    hr_verified_fields: [...new Set([...(Array.isArray(job.hr_verified_fields) ? job.hr_verified_fields : []), ...verified])],
    hr_verified_at: override.updated_at ?? job.hr_verified_at ?? null,
  };
}

export function selectJobPoolRows(rows = [], context = {}) {
  const currentUserId = String(context.currentUserId ?? "");
  const applicationJobIds = new Set((context.applicationJobIds ?? []).map(String));
  const packageJobIds = new Set((context.packageJobIds ?? []).map(String));
  const bySource = new Map();
  const priority = (job) => {
    const id = String(job.id ?? "");
    let score = 0;
    if (applicationJobIds.has(id)) score += 1000;
    if (packageJobIds.has(id)) score += 500;
    if (String(job.user_id ?? "") === currentUserId) score += 100;
    if (job.visibility === "public") score += 20;
    const updated = Date.parse(String(job.updated_at ?? job.created_at ?? ""));
    return score + (Number.isFinite(updated) ? updated / 1e14 : 0);
  };
  for (const row of rows) {
    const key = String(row.source_id || row.source_url || row.id);
    const existing = bySource.get(key);
    if (!existing || priority(row) > priority(existing)) bySource.set(key, row);
  }
  return [...bySource.values()];
}

export const JOB_OVERRIDE_FIELDS = OVERRIDE_FIELDS;
