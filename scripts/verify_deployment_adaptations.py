from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    path = ROOT / rel
    assert path.exists(), f"missing adapted file: {rel}"
    return path.read_text(encoding="utf-8", errors="strict")


def json_file(rel: str):
    return json.loads(read(rel))


checks: list[tuple[str, bool]] = []


def check(name: str, condition: bool) -> None:
    checks.append((name, bool(condition)))
    assert condition, f"deployment adaptation failed: {name}"


# 1. Supabase schema routing.
supabase_control = read("apps/web/lib/supabase-control.ts")
check("01 career_copilot schema constant", 'const DATA_SCHEMA = "career_copilot"' in supabase_control)
check("01 data/admin Accept-Profile headers", supabase_control.count('headers.set("Accept-Profile", DATA_SCHEMA)') >= 2)
check("01 data/admin Content-Profile headers", supabase_control.count('headers.set("Content-Profile", DATA_SCHEMA)') >= 2)
check("01 canonical schema bootstrap", "create schema if not exists career_copilot" in read("supabase/migrations/0009_vector_extension_schema.sql").lower())
check("01 existing database schema guard", "0027_career_copilot_schema_guard.sql" in {p.name for p in (ROOT / "supabase/migrations").glob("*.sql")})

# 2-3. Runtime public configuration.
layout = read("apps/web/app/layout.tsx")
check("02 dynamic layout", 'export const dynamic = "force-dynamic"' in layout)
check("02 runtime config script", "__CAREER_COPILOT_PUBLIC_CONFIG__" in layout and "SUPABASE_URL" in layout and "SUPABASE_PUBLISHABLE_KEY" in layout)
browser = read("apps/web/lib/supabase-browser.ts")
check("03 browser runtime config", "runtimePublicConfig" in browser and "__CAREER_COPILOT_PUBLIC_CONFIG__" in browser)

# 4-8. TS/MJS declaration compatibility.
tsconfig = json_file("apps/web/tsconfig.json")
check("04 allowJs true", tsconfig["compilerOptions"].get("allowJs") is True)
expected_declarations = {
    "agent-runtime.d.mts", "application-export.d.mts", "application-kit.d.mts",
    "application-lifecycle.d.mts", "application-plan.d.mts", "career-agent-graph.d.mts",
    "control-rules.d.mts", "daily-recommendation-rules.d.mts", "docx-export.d.mts",
    "interview-learning.d.mts", "job-sources.d.mts", "job-user-view.d.mts",
    "knowledge-rules.d.mts", "platform-scale.d.mts", "portfolio-demo.d.mts",
    "recommendation-experience.d.mts", "recommendation-profile.d.mts",
}
lib = ROOT / "apps/web/lib"
check("05 all required d.mts declarations", expected_declarations.issubset({p.name for p in lib.glob("*.d.mts")}))
check("05 no legacy lib d.ts declarations", not list(lib.glob("*.d.ts")))
check("06 discovery import has mjs", '"@/lib/job-sources.mjs"' in read("apps/web/lib/discovery-service.ts"))
check("06 export import has mjs", '"@/lib/application-export.mjs"' in read("apps/web/app/api/control/applications/[id]/export/route.ts"))
check("06 gmail import has mjs", '"@/lib/application-export.mjs"' in read("apps/web/app/api/control/applications/[id]/gmail-draft/route.ts"))
check("07 evaluation declaration relaxed", "evaluation: Record<string, any>" in read("apps/web/lib/control-rules.d.mts"))
recommendation_declaration = read("apps/web/lib/recommendation-profile.d.mts")
check("08 normalized profile details", "details: ProfileDetails" in recommendation_declaration)
check("08 default profile details export", "DEFAULT_PROFILE_DETAILS" in recommendation_declaration)

# 9-12. Scheduler and validator alignment.
scheduler_config = read("workers/scheduler/wrangler.jsonc")
check("09 scheduler SUN cron", '"0 12 * * SUN"' in scheduler_config and '"0 12 * * 0"' not in scheduler_config)
scheduler_source = read("workers/scheduler/src/index.ts")
check("10 scheduler Env declaration", "declare global" in scheduler_source and "CRON_SHARED_SECRET?: string" in scheduler_source)
check("10 ScheduledController", "ScheduledController" in scheduler_source and "ScheduledEvent" not in scheduler_source)
scheduler_tsconfig = json_file("workers/scheduler/tsconfig.json")
check("11 scheduler ES2022 only", scheduler_tsconfig["compilerOptions"].get("lib") == ["ES2022"] and scheduler_tsconfig["compilerOptions"].get("types") == [])
validator = read("scripts/validate_cloudflare.py")
check("12 validator SUN cron", '0 12 * * SUN' in validator and 'event.cron === "0 12 * * 0"' not in validator)

# 13-14. Validation scripts remain readable and exclude transient output.
verifier = read("scripts/verify_complete_package.py")
for name, content in [("13 cloudflare validator", validator), ("14 package verifier", verifier)]:
    check(f"{name} no replacement character", "�" not in content)
    check(f"{name} ignores node_modules", "node_modules" in content)
    check(f"{name} ignores .next", ".next" in content)
    check(f"{name} ignores .open-next", ".open-next" in content)
    check(f"{name} ignores .wrangler", ".wrangler" in content)

# 15. CI native dependency restoration.
workflow = read(".github/workflows/cloudflare-deploy.yml")
check("15 Linux OpenNext native dependency in both jobs", workflow.count("@ast-grep/napi-linux-x64-gnu@0.40.5") >= 2)
check("15 complete test suite in validation", "npm run test:complete" in workflow)
check("15 Supabase migration validation in CI", "python scripts/validate_supabase_migrations.py" in workflow)
evidence_workflow = read(".github/workflows/engineering-evidence.yml")
check("15 evidence workflow does not use secrets in if", "if: ${{ secrets." not in evidence_workflow)
check("15 evidence workflow keeps repo path inside checkout", "--repo .. \\\n" in evidence_workflow and "git -C .." in evidence_workflow)
check("15 API project root resolves to repository", "parents[2]" in read("apps/api/app/config.py"))

# 16-19. Windows cleanup, export and Gmail security.
check("16 Windows SQLite cleanup", "_force_remove_db" in read("apps/api/tests/conftest.py"))
check("17 Windows git cleanup", "_rmtree_force" in read("apps/api/tests/test_milestone03.py"))
export_route = read("apps/web/app/api/control/applications/[id]/export/route.ts")
check("18 Buffer DOCX response", 'import { Buffer } from "node:buffer"' in export_route and "Buffer.from" in export_route)
gmail_route = read("apps/web/app/api/control/applications/[id]/gmail-draft/route.ts")
check("19 Gmail server token", "gmailAccessToken(auth.userId)" in gmail_route)
check("19 no client Gmail token", "body.gmail_access_token" not in gmail_route)

# 20-26. TypeScript fixes.
check("20 jobs enriched type", "const enrichedJobs: Array<Record<string, any>>" in read("apps/web/app/api/control/jobs/route.ts"))
check("21 interviews map type", ".map<Record<string, any>>" in read("apps/web/app/api/control/interviews/route.ts"))
check("22 source run body type", "const body: Record<string, any>" in read("apps/web/app/api/control/sources/run/route.ts"))
check("23 workflow resolution type", "const resolution: Record<string, any>" in read("apps/web/app/api/control/workflows/[id]/resume/route.ts"))
check("24 agent report type", "const report: Record<string, any>" in read("apps/web/lib/agent-service.ts"))
check("25 nullable source quality", "data?.source_quality ?? []" in read("apps/web/components/analytics-workspace.tsx"))
check("26 resume item type", ".map((item: string)" in read("apps/web/components/resume-agent-workspace.tsx"))

# 27-28. Package validity.
web_package = json_file("apps/web/package.json")
check("27 web check is tsc", web_package["scripts"].get("check") == "tsc --noEmit")
check("28 valid Radix Dialog version", web_package["dependencies"].get("@radix-ui/react-dialog") == "^1.1.14")
check("28 unified release metadata", json_file("release.json")["version"] == "2.0.2" and 'version: "2.0.2"' in read("apps/web/lib/release.ts"))

# 29-33. Migration identities; later releases must not reuse these numbers.
expected_migrations = {
    "0016_rls_grants_shared_pool.sql",
    "0017_application_kits_one_click_handoff.sql",
    "0018_recommendation_experience.sql",
    "0019_material_versions_application_tracking.sql",
    "0020_platform_scale_quality_analytics.sql",
}
migrations = ROOT / "supabase/migrations"
actual = {p.name for p in migrations.glob("*.sql")}
check("29-33 adapted migration names", expected_migrations.issubset(actual))
for number, expected in {
    "0016": "0016_rls_grants_shared_pool.sql",
    "0017": "0017_application_kits_one_click_handoff.sql",
    "0018": "0018_recommendation_experience.sql",
    "0019": "0019_material_versions_application_tracking.sql",
    "0020": "0020_platform_scale_quality_analytics.sql",
}.items():
    numbered = [name for name in actual if name.startswith(number + "_")]
    check(f"migration {number} reserved", numbered == [expected])

# The first hotfix migration after the protected range.
check("new migration starts at 0021", "0021_source_connections_and_platform_search.sql" in actual)
check("0022 instant search migration follows adapted range", "0022_instant_profile_aggregate_search.sql" in actual)
check("0022 does not reuse protected migration numbers", not any(name.startswith(("0016_instant", "0017_instant", "0018_instant", "0019_instant", "0020_instant")) for name in actual))

passed = [name for name, ok in checks if ok]
print(json.dumps({"ok": True, "checks_passed": len(passed), "checks": passed}, ensure_ascii=False, indent=2))
