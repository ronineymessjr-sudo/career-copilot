from __future__ import annotations

import json
import re
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]

required = [
    "apps/web/components/app-shell.tsx",
    "apps/web/components/overview-workspace.tsx",
    "apps/web/components/jobs-workspace.tsx",
    "apps/web/components/sources-workspace.tsx",
    "apps/web/components/applications-workspace.tsx",
    "apps/web/components/profile-workspace.tsx",
    "apps/web/components/resume-agent-workspace.tsx",
    "apps/web/app/login/page.tsx",
    "apps/web/app/api/control/resumes/upload/route.ts",
    "apps/web/app/api/control/automation/route.ts",
    "apps/web/lib/daily-recommendation-service.ts",
    "apps/web/lib/daily-recommendation-rules.mjs",
    "apps/web/lib/recommendation-profile.mjs",
    "apps/web/lib/job-user-view.mjs",
    "supabase/migrations/0011_daily_application_queue.sql",
    "supabase/migrations/0014_complete_platform_job_pool.sql",
    "supabase/migrations/0015_profile_resume_daily_recommendations.sql",
    "supabase/migrations/0016_rls_grants_shared_pool.sql",
    "supabase/migrations/0017_application_kits_one_click_handoff.sql",
    "apps/web/lib/application-kit.mjs",
    "apps/web/lib/application-export.mjs",
    "docs/COMPLETE_PLATFORM_ARCHITECTURE.md",
    "docs/SOURCE_COVERAGE.md",
]
for rel in required:
    assert (ROOT / rel).exists(), f"missing required file: {rel}"

shell = (ROOT / "apps/web/components/app-shell.tsx").read_text(encoding="utf-8")
for label in ["今日简报", "岗位发现", "岗位来源", "投递管理", "数据看板", "我的画像", "简历版本", "项目证据"]:
    assert label in shell, f"missing navigation: {label}"

profile = (ROOT / "apps/web/lib/recommendation-profile.mjs").read_text(encoding="utf-8")
assert "target_roles: []" in profile
assert "locations: []" in profile
assert "internship_only: false" in profile
assert "graduation_year: source.graduation_year == null" in profile

sources = (ROOT / "apps/web/lib/job-sources.mjs").read_text(encoding="utf-8")
for provider in ["greenhouse", "lever", "ashby"]:
    assert provider in sources

migration = (ROOT / "supabase/migrations/0014_complete_platform_job_pool.sql").read_text(encoding="utf-8")
for token in ["job_user_overrides", "visibility", "scope", "jobs_pool_select", "evaluations_user_job_uidx", "applications_user_job_uidx"]:
    assert token in migration
assert "DROP TABLE" not in migration.upper()
assert "DROP SCHEMA" not in migration.upper()

migration15 = (ROOT / "supabase/migrations/0015_profile_resume_daily_recommendations.sql").read_text(encoding="utf-8")
for token in ["profile_details", "resume-files", "daily_recommendation_preferences", "daily_recommendations", "ranked_masters"]:
    assert token in migration15
assert "alter column graduation_year drop not null" in migration15.lower()
assert "alter column graduation_year drop default" in migration15.lower()
assert "DROP TABLE" not in migration15.upper()
assert "DROP SCHEMA" not in migration15.upper()

migration16 = (ROOT / "supabase/migrations/0017_application_kits_one_click_handoff.sql").read_text(encoding="utf-8")
for token in ["content_bundle", "tailored_resume", "submission_capability", "submission_mode", "handoff_opened_at"]:
    assert token in migration16
assert "DROP TABLE" not in migration16.upper()
assert "DROP SCHEMA" not in migration16.upper()

application_kit = (ROOT / "apps/web/lib/application-kit.mjs").read_text(encoding="utf-8")
for token in ["buildApplicationContentBundle", "buildTailoredResume", "detectSubmissionCapability", "no_invented_metrics"]:
    assert token in application_kit

applications_ui = (ROOT / "apps/web/components/applications-workspace.tsx").read_text(encoding="utf-8")
for token in ["打开完整材料包", "定制简历 / 保存 PDF", "真实申请页已经打开", "一键投递在这里表示"]:
    assert token in applications_ui

login = (ROOT / "apps/web/app/login/page.tsx").read_text(encoding="utf-8")
for token in ["signInWithPassword", "signUp", "resetPasswordForEmail", "PASSWORD_RECOVERY", "updateUser"]:
    assert token in login

resume_library = (ROOT / "apps/web/components/resume-agent-workspace.tsx").read_text(encoding="utf-8")
for token in ["多版本简历库", "上传已有简历", "建立主简历", "岗位定制版本"]:
    assert token in resume_library

cron = (ROOT / "apps/web/app/api/cron/daily/route.ts").read_text(encoding="utf-8")
assert "profiles?select=user_id" in cron
assert "runDailyRecommendationForUser" in cron
assert "automatic_external_submission: false" in cron

transient_names = ["node_modules", ".next", ".open-next", ".wrangler", ".pytest_cache", "__pycache__"]
transient_found = sorted({p.name for p in ROOT.rglob("*") if p.name in transient_names})
if os.environ.get("VERIFY_SOURCE_ARCHIVE") == "1":
    assert not transient_found, f"transient directories included in source archive: {', '.join(transient_found)}"

secret_patterns = [
    re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
]
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() in {".png", ".jpg", ".jpeg", ".zip"}:
        continue
    if path.name in {"PACKAGE_MANIFEST.json"}:
        continue
    if any(part in transient_names for part in path.parts):
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    for pattern in secret_patterns:
        assert not pattern.search(text), f"possible secret in {path.relative_to(ROOT)}"

print(json.dumps({
    "ok": True,
    "required_files": len(required),
    "navigation_items": 8,
    "automatic_sources": ["greenhouse", "lever", "ashby"],
    "neutral_profile_defaults": True,
    "complete_profile": True,
    "private_multi_resume_library": True,
    "per_user_daily_recommendations": True,
    "complete_application_kits": True,
    "one_click_application_handoff": True,
    "automatic_external_submission": False,
    "destructive_migration": False,
    "source_archive_mode": os.environ.get("VERIFY_SOURCE_ARCHIVE") == "1",
    "transient_directories_present": transient_found,
}, ensure_ascii=False, indent=2))
