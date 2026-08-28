import { buildApplicationContentBundle } from "./application-kit.mjs";
import { SKILLS as SKILL_ALIASES, matchAlias } from "./skills.mjs";

const ROLE_KEYWORDS = [
  "开发", "工程", "产品", "设计", "运营", "市场", "销售", "财务", "法务", "人力",
  "数据", "分析", "测试", "实施", "解决方案", "咨询", "研究", "供应链", "客户成功",
  "agent", "智能体", "大模型", "llm", "全栈", "后端", "前端", "移动端", "算法",
];


const LOCATION_SEGMENTS = [
  ["远程优先", 15],
  ["南通崇川", 14],
  ["南京建邺/浦口", 13],
  ["上海/苏州/杭州", 10],
  ["中厂补充", 7],
  ["大厂冲刺", 4],
  ["其他补充", 3],
];

const ALLOWED_TRANSITIONS = {
  discovered: new Set(["verified", "paused"]),
  verified: new Set(["prepared", "paused"]),
  prepared: new Set(["ready_to_submit", "paused"]),
  ready_to_submit: new Set(["submitted", "paused"]),
  submitted: new Set(["read", "contacting", "test", "interview", "rejected", "paused"]),
  read: new Set(["contacting", "test", "interview", "rejected", "paused"]),
  contacting: new Set(["test", "interview", "offer", "rejected", "paused"]),
  test: new Set(["interview", "offer", "rejected", "paused"]),
  interview: new Set(["offer", "rejected", "paused"]),
  offer: new Set(["paused"]),
  rejected: new Set([]),
  paused: new Set(["verified", "prepared", "ready_to_submit", "submitted"]),
};

function normalize(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return normalize(value).toLowerCase();
}

function matchFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function includesAny(text, values) {
  return values.some((value) => text.includes(value));
}

function parseInteger(match, index = 1) {
  if (!match) return null;
  const value = Number.parseInt(match[index], 10);
  return Number.isFinite(value) ? value : null;
}

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] ?? null;
}

function extractLocation(text) {
  const cities = ["南通", "南京", "上海", "苏州", "杭州", "北京", "深圳", "广州", "无锡", "常州"];
  const districts = ["崇川", "通州", "开发区", "建邺", "建业", "浦口", "徐汇", "萧山", "滨江", "余杭"];
  return {
    city: cities.find((city) => text.includes(city)) ?? "",
    district: districts.find((district) => text.includes(district)) ?? "",
  };
}

function extractSalary(text) {
  const match = matchFirst(text, [
    /(\d{2,4})\s*[-~至]\s*(\d{2,4})\s*元\s*[/／]?\s*(天|日)/i,
    /(\d{2,4})\s*[-~至]\s*(\d{2,4})\s*(?:元|￥|¥)?\s*[/／·每]?\s*(天|日|月)/i,
    /(\d{2,5})\s*[-~至]\s*(\d{2,5})\s*元\s*[/／]?\s*月/i,
    /(\d+(?:\.\d+)?)\s*[kK]?\s*[-~至]\s*(\d+(?:\.\d+)?)\s*[kK]\s*(?:[/／·每]?\s*(月|月薪))?/i,
    /(\d{2,4})\s*元\s*[/／]?\s*(天|日)/i,
    /(\d{2,4})\s*(?:元|￥|¥)?\s*[/／·每]\s*(天|日|月)/i,
  ]);
  return match?.[0] ?? "";
}

function parseSalaryRange(value) {
  const text = normalize(value);
  if (!text || /面议|未公开|保密|待定/i.test(text)) return null;
  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*[kK]?\s*[-~至]\s*(\d+(?:\.\d+)?)\s*[kK](?:\s*[/／·每]?\s*(月|月薪))?/i);
  if (kMatch) return { min: Number(kMatch[1]) * 1000, max: Number(kMatch[2]) * 1000, period: "month" };
  const singleKMatch = text.match(/(\d+(?:\.\d+)?)\s*[kK](?:\s*[/／·每]?\s*(月|月薪))?/i);
  if (singleKMatch) return { min: Number(singleKMatch[1]) * 1000, max: Number(singleKMatch[1]) * 1000, period: "month" };
  const range = text.match(/(\d{2,6})\s*[-~至]\s*(\d{2,6})\s*(?:元|￥|¥)?\s*(?:[/／每]\s*)?(天|日|月)?/i);
  if (range) {
    const period = range[3] === "天" || range[3] === "日" ? "day" : range[3] === "月" ? "month" : null;
    return { min: Number(range[1]), max: Number(range[2]), period };
  }
  const single = text.match(/(\d{2,6})\s*(?:元|￥|¥)?\s*(?:[/／·每]\s*)?(天|日|月)/i);
  if (single) return { min: Number(single[1]), max: Number(single[1]), period: single[2] === "月" ? "month" : "day" };
  return null;
}

function parseFoundedYear(text) {
  const match = matchFirst(normalize(text), [
    /成立于\s*(20\d{2})/,
    /(20\d{2})\s*年成立/,
    /成立年份[：:]?\s*(20\d{2})/,
  ]);
  return parseInteger(match);
}

function parsePublishedAt(text) {
  const match = matchFirst(normalize(text), [
    /(?:发布于|更新于|发布时间[：:]?|更新时间[：:]?)\s*(20\d{2})[-年](\d{1,2})[-月](\d{1,2})日?/,
  ]);
  if (!match) return null;
  return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
}

function inferCompanyTier(text) {
  if (includesAny(text, ["0-20人", "少于20人", "初创", "创业团队", "早期团队"])) return "small";
  if (includesAny(text, ["20-99人", "100-499人", "中型", "成长型"])) return "medium";
  if (includesAny(text, ["1000人以上", "大型集团", "世界500强", "上市公司", "大厂"])) return "large";
  return "unknown";
}

function inferChannel(text, sourceUrl, recruiterEmail) {
  if (recruiterEmail) return "email";
  const url = lower(sourceUrl);
  if (includesAny(url, ["zhipin.com", "nowcoder.com", "liepin.com", "lagou.com"])) return "platform";
  if (url) return "company_form";
  if (includesAny(text, ["官网投递", "申请表", "apply now"])) return "company_form";
  return "platform";
}

function inferWorkplace(text) {
  // Treat common remote-work wording as the same hard-filterable mode. Keep
  // explicit negative wording ahead of the positive match so "不接受远程"
  // cannot be misclassified as a remote role.
  if (/(?:不接受|不支持|不提供|不能|无法|禁止)[^。；;，,\n]{0,6}远程/i.test(text)) return "onsite";
  const remote = includesAny(text, ["可远程", "全国远程", "远程办公", "线上办公", "居家办公", "远程", "remote"]);
  const hybrid = includesAny(text, ["混合办公", "hybrid", "部分远程"]);
  const onsite = includesAny(text, ["坐班", "到岗", "线下办公", "现场办公", "现场到岗", "onsite"]);
  // Conflicting wording cannot safely satisfy a remote-only preference.
  if (remote && (hybrid || onsite)) return "unknown";
  if (remote) return "remote";
  if (hybrid) return "hybrid";
  if (onsite) return "onsite";
  return "unknown";
}

function inferInternship(text) {
  if (includesAny(text, ["实习", "intern"])) return true;
  if (includesAny(text, ["正式岗位", "社会招聘", "校招全职", "全职员工"])) return false;
  return true;
}

function inferStudentAcceptance(text) {
  if (includesAny(text, ["不接受在校生", "仅限已毕业", "社会招聘", "需已毕业"])) return false;
  if (includesAny(text, ["在校生", "在读", "实习生", "本科及以上在读"])) return true;
  return null;
}

function infer2028Acceptance(text) {
  if (includesAny(text, ["不接受2028", "2028届除外", "仅限2027届", "只招2027届"])) return false;
  if (includesAny(text, ["2028届", "28届", "2028年毕业"])) return true;
  return null;
}

export function parseJobIntake(input) {
  const rawText = normalize(input?.raw_text ?? input?.rawText ?? "");
  if (!rawText) throw new Error("raw_text is required");
  const text = lower(rawText);
  const lines = rawText.split(/\r?\n/).map(normalize).filter(Boolean);
  const location = extractLocation(rawText);
  const days = parseInteger(matchFirst(text, [/(?:每周|一周|周)\s*(\d)\s*天/, /(\d)\s*天\s*[/／]\s*周/]));
  const months = parseInteger(matchFirst(text, [/(?:至少|最少|连续|实习)\s*(\d{1,2})\s*个?月/, /(\d{1,2})\s*个?月以上/]));
  const recruiterEmail = input?.recruiter_email ?? input?.recruiterEmail ?? extractEmail(rawText);
  const company = normalize(input?.company) || normalize(lines[0]) || "待核验公司";
  const title = normalize(input?.title) || normalize(lines.find((line) => /实习|intern|agent|产品|开发|工程/.test(lower(line)))) || "待核验岗位";
  const sourceUrl = normalize(input?.source_url ?? input?.sourceUrl);
  const foundedYear = input?.company_founded_year ?? input?.companyFoundedYear ?? parseFoundedYear(rawText);
  const publishedAt = input?.published_at ?? input?.publishedAt ?? parsePublishedAt(rawText);
  return {
    source_id: normalize(input?.source_id ?? input?.sourceId),
    company,
    title,
    description: rawText,
    requirements: normalize(input?.requirements),
    city: normalize(input?.city) || location.city,
    district: normalize(input?.district) || location.district,
    address: normalize(input?.address),
    workplace: input?.workplace ?? inferWorkplace(text),
    company_tier: input?.company_tier ?? input?.companyTier ?? inferCompanyTier(text),
    company_stage: normalize(input?.company_stage ?? input?.companyStage),
    company_size: normalize(input?.company_size ?? input?.companySize),
    is_internship: input?.is_internship ?? inferInternship(text),
    accepts_students: input?.accepts_students ?? inferStudentAcceptance(text),
    accepts_2028: input?.accepts_2028 ?? infer2028Acceptance(text),
    graduation_requirement: normalize(input?.graduation_requirement ?? input?.graduationRequirement),
    days_per_week: input?.days_per_week ?? days,
    minimum_months: input?.minimum_months ?? months,
    salary: normalize(input?.salary) || extractSalary(rawText),
    published_at: publishedAt || null,
    deadline: input?.deadline ?? null,
    source_name: normalize(input?.source_name ?? input?.sourceName),
    source_url: sourceUrl || null,
    source_reliability: Number(input?.source_reliability ?? input?.sourceReliability ?? 3),
    channel: input?.channel ?? inferChannel(text, sourceUrl, recruiterEmail),
    recruiter_email: recruiterEmail,
    raw_payload: {
      raw_text: rawText,
      parser: "deterministic-v1",
      ...(foundedYear != null && Number.isFinite(Number(foundedYear)) ? { company_founded_year: Number(foundedYear) } : {}),
    },
    status: normalize(input?.status) || "open",
  };
}

function mentionedSkills(job) {
  const text = lower(`${job.title} ${job.description} ${job.requirements ?? ""}`);
  const found = [];
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some((alias) => matchAlias(text, alias))) found.push(canonical);
  }
  return found;
}

function verifiedSkillSet(evidence) {
  const set = new Set();
  for (const item of evidence ?? []) {
    if (item.active === false) continue;
    if ((item.verification_status ?? "verified") !== "verified") continue;
    const text = lower(item.skill);
    set.add(text);
    for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
      if (text === canonical || aliases.some((alias) => matchAlias(text, alias))) set.add(canonical);
    }
  }
  return set;
}

function segmentFor(job) {
  if (job.workplace === "remote") return "远程优先";
  if ((job.district ?? "").includes("崇川")) return "南通崇川";
  if (/(建邺|建业|浦口)/.test(job.district ?? "")) return "南京建邺/浦口";
  if (["上海", "苏州", "杭州"].some((city) => (job.city ?? "").includes(city))) return "上海/苏州/杭州";
  if (job.company_tier === "medium") return "中厂补充";
  if (job.company_tier === "large") return "大厂冲刺";
  return "其他补充";
}

function gradeFor(score) {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 65) return "B";
  return "C";
}


export function jobIdentityParts(job) {
  const sourceUrl = normalize(job?.source_url ?? job?.sourceUrl);
  if (sourceUrl) return [sourceUrl];
  return [
    normalize(job?.company ?? job?.company_name),
    normalize(job?.title),
    normalize(job?.city),
    normalize(job?.channel),
  ];
}

export function preserveVerifiedJobFields(parsed, existing = {}) {
  const result = { ...(parsed ?? {}) };
  const rawFields = existing?.hr_verified_fields;
  let verifiedFields = [];
  if (Array.isArray(rawFields)) verifiedFields = rawFields;
  else if (typeof rawFields === "string") {
    try {
      const value = JSON.parse(rawFields);
      if (Array.isArray(value)) verifiedFields = value;
    } catch {}
  }
  for (const field of verifiedFields) {
    const key = String(field ?? "").trim();
    if (!key || !(key in existing)) continue;
    result[key] = existing[key];
  }
  if (verifiedFields.length) {
    result.hr_verified_fields = [...new Set(verifiedFields.map((item) => String(item)).filter(Boolean))];
    result.hr_verified_at = existing.hr_verified_at ?? null;
  }
  return result;
}

export function validatePackageEvidence(applicationPackage, evidence = []) {
  const refs = Array.isArray(applicationPackage?.evidence_refs) ? applicationPackage.evidence_refs : [];
  if (refs.length === 0) {
    return { passed: true, blockers: [], invalid_refs: [], evidence_optional: true };
  }
  const verified = new Map();
  for (const item of evidence ?? []) {
    if (item?.active === false) continue;
    if ((item?.verification_status ?? "verified") !== "verified") continue;
    if (item?.id != null) verified.set(String(item.id), item);
  }
  const invalidRefs = [];
  for (const ref of refs) {
    const id = ref?.id == null ? "" : String(ref.id);
    const current = id ? verified.get(id) : null;
    if (!current) {
      invalidRefs.push({ id: id || null, reason: "evidence_missing_or_unverified" });
      continue;
    }
    const changed = ["skill", "project", "evidence"].some((key) => normalize(current[key]) !== normalize(ref?.[key]));
    if (changed) invalidRefs.push({ id, reason: "evidence_changed" });
  }
  const blockers = [];
  if (invalidRefs.length) blockers.push("投递包引用的证据已删除、停用、取消核验或发生变化，请重新生成材料");
  return {
    passed: invalidRefs.length === 0,
    blockers,
    invalid_refs: invalidRefs,
    evidence_optional: false,
  };
}

export function evaluateJob(job, evidence = [], today = new Date(), profile = {}) {
  const hard_filter_reasons = [];
  const confirmation_questions = [];
  let eligible = true;
  let needs_confirmation = false;
  const todayIso = today.toISOString().slice(0, 10);
  const preferences = profile?.preferences && typeof profile.preferences === "object" ? profile.preferences : {};
  const targetRoles = Array.isArray(preferences.target_roles) ? preferences.target_roles.map(lower).filter(Boolean) : [];
  const preferredLocations = Array.isArray(preferences.locations) ? preferences.locations.map(lower).filter(Boolean) : [];
  const preferredWorkModes = Array.isArray(preferences.work_modes) ? preferences.work_modes.map(lower).filter(Boolean) : [];
  const profileKeywords = Array.isArray(preferences.keywords) ? preferences.keywords.map(lower).filter(Boolean) : [];
  const profileConfigured = Boolean(
    normalize(profile?.major) || normalize(profile?.degree) || targetRoles.length || preferredLocations.length || preferredWorkModes.length || profileKeywords.length
  );
  const internshipOnly = preferences.internship_only === true;
  const isInternship = job.is_internship === true;
  const salaryMin = preferences.salary_min == null || preferences.salary_min === "" ? null : Number(preferences.salary_min);
  const salaryMax = preferences.salary_max == null || preferences.salary_max === "" ? null : Number(preferences.salary_max);
  const salaryConfigured = Number.isFinite(salaryMin) || Number.isFinite(salaryMax);
  const salaryPeriod = ["day", "month", "any"].includes(String(preferences.salary_period)) ? String(preferences.salary_period) : "any";
  const salaryMatchMode = preferences.salary_match_mode === "contained" ? "contained" : "overlap";
  const foundedFrom = preferences.company_founded_from == null || preferences.company_founded_from === "" ? null : Number(preferences.company_founded_from);
  const foundedTo = preferences.company_founded_to == null || preferences.company_founded_to === "" ? null : Number(preferences.company_founded_to);
  const foundedConfigured = Number.isFinite(foundedFrom) || Number.isFinite(foundedTo);
  const salaryRangeInvalid = Number.isFinite(salaryMin) && Number.isFinite(salaryMax) && salaryMin > salaryMax;
  const foundedRangeInvalid = Number.isFinite(foundedFrom) && Number.isFinite(foundedTo) && foundedFrom > foundedTo;

  if (salaryRangeInvalid) {
    needs_confirmation = true;
    confirmation_questions.push("薪资最低值不能高于最高值");
  }
  if (foundedRangeInvalid) {
    needs_confirmation = true;
    confirmation_questions.push("公司成立年份下限不能晚于上限");
  }

  if (internshipOnly && !isInternship) {
    eligible = false;
    hard_filter_reasons.push("当前画像只考虑实习岗位");
  }
  if (!["open", "active", "unknown"].includes(lower(job.status || "open"))) {
    eligible = false;
    hard_filter_reasons.push("岗位当前不是开放状态");
  }

  const graduationYear = profile?.graduation_year == null || profile?.graduation_year === "" ? 0 : Number(profile.graduation_year);
  const availabilityDays = Math.max(1, Number(profile?.availability_days ?? 3));
  const availabilityMonths = Math.max(1, Number(profile?.availability_months ?? 3));

  if (!profileConfigured) {
    needs_confirmation = true;
    confirmation_questions.push("先完善个人画像，系统才能判断届别、地点和时间要求");
  } else if (isInternship) {
    if (job.accepts_students === false) {
      eligible = false;
      hard_filter_reasons.push("明确不接受在校生");
    } else if (job.accepts_students == null) {
      needs_confirmation = true;
      confirmation_questions.push("是否接受在校生？");
    }

    const graduationText = String(job.graduation_requirement ?? "");
    const years = [...graduationText.matchAll(/20\d{2}/g)].map((match) => Number(match[0]));
    if (!graduationYear) {
      needs_confirmation = true;
      confirmation_questions.push("请先在个人画像中填写毕业年份");
    } else if (years.length && !years.includes(graduationYear)) {
      eligible = false;
      hard_filter_reasons.push(`岗位届别要求不包含 ${graduationYear} 届`);
    } else if (graduationYear === 2028 && job.accepts_2028 === false) {
      eligible = false;
      hard_filter_reasons.push("明确不接受 2028 届");
    } else if (!years.length && (graduationYear !== 2028 || job.accepts_2028 == null)) {
      needs_confirmation = true;
      confirmation_questions.push(`是否接受 ${graduationYear} 届？`);
    }

    if (job.days_per_week != null && Number(job.days_per_week) > availabilityDays) {
      eligible = false;
      hard_filter_reasons.push(`岗位要求每周 ${job.days_per_week} 天，超过当前可实习 ${availabilityDays} 天`);
    } else if (job.days_per_week == null) {
      needs_confirmation = true;
      confirmation_questions.push("每周最低出勤天数是多少？");
    }
    if (job.minimum_months != null && Number(job.minimum_months) > availabilityMonths) {
      eligible = false;
      hard_filter_reasons.push(`岗位要求至少 ${job.minimum_months} 个月，超过当前可持续 ${availabilityMonths} 个月`);
    } else if (job.minimum_months == null) {
      needs_confirmation = true;
      confirmation_questions.push("最短实习周期是多少？");
    }
  } else {
    const graduationText = String(job.graduation_requirement ?? "");
    const years = [...graduationText.matchAll(/20\d{2}/g)].map((match) => Number(match[0]));
    if (profileConfigured && years.length && !years.includes(graduationYear)) {
      eligible = false;
      hard_filter_reasons.push(`岗位届别要求不包含 ${graduationYear} 届`);
    }
  }

  if (job.deadline && String(job.deadline) < todayIso) {
    eligible = false;
    hard_filter_reasons.push("投递已截止");
  }

  if (salaryConfigured && !salaryRangeInvalid) {
    const salary = parseSalaryRange(job.salary);
    if (!salary || (salaryPeriod !== "any" && salary.period && salary.period !== salaryPeriod) || (salaryPeriod !== "any" && !salary.period)) {
      needs_confirmation = true;
      confirmation_questions.push("岗位薪资或薪资周期无法核验");
    } else {
      const lowerBound = Number.isFinite(salaryMin) ? salaryMin : Number.NEGATIVE_INFINITY;
      const upperBound = Number.isFinite(salaryMax) ? salaryMax : Number.POSITIVE_INFINITY;
      const matches = salaryMatchMode === "contained"
        ? salary.min >= lowerBound && salary.max <= upperBound
        : salary.max >= lowerBound && salary.min <= upperBound;
      if (!matches) {
        eligible = false;
        hard_filter_reasons.push(`岗位薪资 ${job.salary || "未公开"} 不符合当前薪资范围`);
      }
    }
  }

  if (foundedConfigured && !foundedRangeInvalid) {
    const rawPayload = job.raw_payload && typeof job.raw_payload === "object" ? job.raw_payload : {};
    const foundedYear = Number(job.company_founded_year ?? rawPayload.company_founded_year ?? parseFoundedYear(`${job.company_name ?? job.company ?? ""} ${job.description ?? ""}`));
    if (!Number.isFinite(foundedYear)) {
      needs_confirmation = true;
      confirmation_questions.push("公司成立年份无法核验");
    } else if ((Number.isFinite(foundedFrom) && foundedYear < foundedFrom) || (Number.isFinite(foundedTo) && foundedYear > foundedTo)) {
      eligible = false;
      hard_filter_reasons.push(`公司成立年份 ${foundedYear} 不在当前范围内`);
    }
  }

  const text = lower(`${job.title} ${job.description} ${job.requirements ?? ""}`);
  const genericRoleHits = ROLE_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  const targetRoleHits = targetRoles.filter((keyword) => text.includes(keyword));
  const role_score = targetRoles.length
    ? Math.min(25, targetRoleHits.length ? 16 + targetRoleHits.length * 3 : 7 + Math.min(5, genericRoleHits))
    : Math.min(20, 10 + genericRoleHits * 2);

  const explicitSkills = mentionedSkills(job);
  const evidenceSkills = (evidence ?? [])
    .filter((item) => item?.active !== false && (item?.verification_status ?? "verified") === "verified")
    .map((item) => lower(item?.skill))
    .filter((skill) => skill && text.includes(skill));
  const preferenceSkills = profileKeywords.filter((skill) => text.includes(skill));
  const jobSkills = [...new Set([...explicitSkills, ...evidenceSkills, ...preferenceSkills])];
  const profileSkills = verifiedSkillSet(evidence);
  for (const keyword of profileKeywords) profileSkills.add(keyword);
  const matched_skills = jobSkills.filter((skill) => profileSkills.has(skill)).sort();
  const missing_skills = jobSkills.filter((skill) => !profileSkills.has(skill)).sort();
  const skill_score = jobSkills.length === 0 ? 12 : Math.min(25, Math.round(25 * matched_skills.length / jobSkills.length));

  const segment = segmentFor(job);
  const locationText = lower(`${job.city ?? ""} ${job.district ?? ""} ${job.address ?? ""} ${job.workplace ?? ""}`);
  const workplace = lower(job.workplace || "unknown");
  if (preferredWorkModes.length) {
    if (workplace === "unknown") {
      needs_confirmation = true;
      confirmation_questions.push("岗位办公方式无法核验，不能按当前办公偏好直接准备投递");
    } else if (!preferredWorkModes.includes(workplace)) {
      eligible = false;
      hard_filter_reasons.push(`岗位办公方式 ${workplace} 不符合当前偏好`);
    }
  }
  const locationMatch = preferredLocations.some((item) => locationText.includes(item));
  const workModeMatch = preferredWorkModes.some((item) => item === workplace || locationText.includes(item));
  const location_score = !preferredLocations.length && !preferredWorkModes.length ? 8 : locationMatch || workModeMatch ? 15 : 5;
  const schedule_score = !isInternship || (Number(job.days_per_week ?? availabilityDays) <= availabilityDays && Number(job.minimum_months ?? availabilityMonths) <= availabilityMonths) ? 10 : 3;
  const company_score = { small: 7, medium: 8, large: 8, unknown: 6 }[job.company_tier ?? "unknown"] ?? 6;
  const matched_evidence = (evidence ?? []).filter((item) => {
    if (item.active === false || (item.verification_status ?? "verified") !== "verified") return false;
    const skill = lower(item.skill);
    return matched_skills.some((matched) => skill.includes(matched) || matched.includes(skill));
  }).slice(0, 6);
  const evidence_score = Math.min(10, matched_evidence.length ? 2 + matched_evidence.length * 2 : 1);
  const source_score = Math.max(1, Math.min(5, Number(job.source_reliability ?? 3)));
  let total_score = Math.max(0, Math.min(100, role_score + skill_score + location_score + schedule_score + company_score + evidence_score + source_score));
  if (!eligible) total_score = Math.min(total_score, 59);

  let inferred_hr_preference = "基于 JD 的推断：偏好信息不足，需要向招聘方确认实际工作重心。";
  if (includesAny(text, ["快速", "独立", "从0到1", "mvp", "落地", "交付"])) {
    inferred_hr_preference = "基于 JD 的推断：团队更重快速交付、独立解决问题和结果落地。";
  } else if (includesAny(text, ["prd", "需求", "用户", "原型", "产品"])) {
    inferred_hr_preference = "基于 JD 的推断：团队更重产品思维、需求拆解和跨团队沟通。";
  } else if (includesAny(text, ["客户", "实施", "解决方案", "销售"])) {
    inferred_hr_preference = "基于 JD 的推断：团队更重客户沟通、方案实施和结果交付。";
  }

  const risks = [];
  if (missing_skills.length) risks.push(`能力缺口：${missing_skills.slice(0, 5).join("、")}`);
  if (needs_confirmation) risks.push("画像或岗位条件不完整，不能直接提交");
  if (job.company_tier === "small") risks.push("小团队可能要求完整交付，需要确认导师、评审机制和任务边界");
  if (salaryConfigured && !job.salary) risks.push("岗位未公开可核验薪资，投递前确认薪资周期与范围");
  if (foundedConfigured && !Number.isFinite(Number(job.company_founded_year ?? job.raw_payload?.company_founded_year))) risks.push("公司成立年份未从岗位来源核验");
  if (/单休|大小周|单双休/.test(text)) risks.push("JD 提到单休、大小周或单双休，投递前确认每周休息安排");
  if (/加班|晚间在线|高强度|长期出差/.test(text)) risks.push("JD 提到加班、晚间在线、高强度或长期出差，投递前确认实际工作节奏");

  return {
    eligible,
    needs_confirmation,
    hard_filter_reasons,
    confirmation_questions: [...new Set(confirmation_questions)],
    role_score,
    skill_score,
    location_score,
    schedule_score,
    company_score,
    evidence_score,
    source_score,
    total_score,
    grade: gradeFor(total_score),
    segment,
    matched_skills,
    missing_skills,
    matched_evidence,
    inferred_hr_preference,
    interview_risks: risks,
  };
}

export function buildApplicationPackage(job, evaluation, evidence = [], resumeVersions = [], options = {}) {
  if (!evaluation?.eligible) throw new Error("岗位未通过硬性过滤");
  const verified = (evidence ?? []).filter((item) => item.active !== false && (item.verification_status ?? "verified") === "verified");
  const selectedEvidence = verified.filter((item) => {
    const skill = lower(item.skill);
    return (evaluation.matched_skills ?? []).some((matched) => skill.includes(matched) || matched.includes(skill));
  }).slice(0, 4);
  const fallbackEvidence = selectedEvidence.length ? selectedEvidence : verified.slice(0, 4);
  const selectedResumeId = String(options?.selected_resume_id ?? "");
  const activeResumes = (resumeVersions ?? []).filter((item) => item?.status !== "archived");
  const resume = (selectedResumeId ? activeResumes.find((item) => String(item.id) === selectedResumeId) : null)
    ?? activeResumes.find((item) => String(item.target_job_id ?? "") === String(job?.id ?? "") && item.status === "approved")
    ?? activeResumes.find((item) => item.status === "approved")
    ?? activeResumes.find((item) => item.is_master)
    ?? activeResumes[0]
    ?? null;
  const candidate = options?.profile && typeof options.profile === "object" ? options.profile : {};
  const contentBundle = buildApplicationContentBundle({
    job,
    evaluation,
    profile: candidate,
    resume,
    evidence: fallbackEvidence,
    accountEmail: String(options?.account_email ?? ""),
  });
  const evidenceRefs = fallbackEvidence.map((item) => ({
    id: item.id ?? null,
    skill: item.skill,
    project: item.project,
    evidence: item.evidence,
    confidence: item.confidence ?? 90,
  }));
  const resumeContent = resume?.content && typeof resume.content === "object" ? resume.content : {};
  const profileDetails = candidate?.profile_details && typeof candidate.profile_details === "object" ? candidate.profile_details : {};
  const hasResumeMaterial = Boolean(
    resume?.storage_path || resume?.file_path || resume?.plain_text || Object.keys(resumeContent).length,
  );
  const hasProfileMaterial = Boolean(
    profileDetails.summary || profileDetails.headline || (profileDetails.skills ?? []).length ||
    (profileDetails.experience ?? []).length || (profileDetails.education ?? []).length || (profileDetails.projects ?? []).length,
  );
  const blockers = [];
  if (evaluation.needs_confirmation) blockers.push(...evaluation.confirmation_questions);
  if (!hasResumeMaterial && !hasProfileMaterial) blockers.push("没有可用于生成简历的画像或简历内容");
  const truthPassed = blockers.length === 0;
  return {
    resume_version_id: resume?.id ?? null,
    resume_version_name: resume?.name ?? "画像生成简历",
    resume_filename: resume?.original_filename ?? resume?.storage_path?.split("/").pop() ?? resume?.file_path?.split("/").pop() ?? "",
    greeting: contentBundle.greeting,
    email_subject: contentBundle.email_subject,
    email_body: contentBundle.email_body,
    highlighted_keywords: contentBundle.highlighted_keywords,
    evidence_refs: evidenceRefs,
    content_bundle: contentBundle,
    tailored_resume: contentBundle.tailored_resume,
    submission_capability: contentBundle.submission_capability,
    prepared_at: new Date().toISOString(),
    truth_check: {
      passed: truthPassed,
      blockers,
      generated_from_saved_profile_and_resume_only: true,
      verified_evidence_only_when_evidence_is_used: true,
      evidence_optional: evidenceRefs.length === 0,
      no_invented_metrics: true,
    },
    approval: "pending",
  };
}

export function validateApplicationTransition(current, next, context = {}) {
  const from = lower(current);
  const to = lower(next);
  if (from === to) return { ok: true, reason: "no-op" };
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.has(to)) return { ok: false, reason: `不允许从 ${from} 直接变更为 ${to}` };
  if (to === "ready_to_submit" && context.packageApproval !== "approved") {
    return { ok: false, reason: "投递包尚未批准" };
  }
  if (to === "submitted" && context.confirmedByUser !== true) {
    return { ok: false, reason: "必须由用户明确确认已完成提交" };
  }
  return { ok: true, reason: "allowed" };
}

export function computeReadiness({ evaluation, applicationPackage, application }) {
  const blockers = [];
  if (!evaluation) blockers.push("尚未完成岗位评分");
  if (evaluation && !evaluation.eligible) blockers.push(...(evaluation.hard_filter_reasons ?? ["岗位未通过硬过滤"]));
  if (evaluation?.needs_confirmation) blockers.push(...(evaluation.confirmation_questions ?? []));
  if (!applicationPackage) blockers.push("尚未生成投递包");
  if (applicationPackage && applicationPackage.approval !== "approved") blockers.push("投递包尚未批准");
  if (applicationPackage?.truth_check?.passed !== true) blockers.push(...(applicationPackage?.truth_check?.blockers ?? ["真实性检查未通过"]));
  const status = application?.status ?? "discovered";
  return {
    ready_to_submit: blockers.length === 0 && status === "ready_to_submit",
    status,
    blockers: [...new Set(blockers)],
    requires_explicit_submission_confirmation: true,
  };
}
