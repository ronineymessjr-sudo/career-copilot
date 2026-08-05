from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

required = [
    "apps/web/components/app-shell.tsx",
    "apps/web/components/overview-workspace.tsx",
    "apps/web/components/jobs-workspace.tsx",
    "apps/web/components/sources-workspace.tsx",
    "apps/web/components/applications-workspace.tsx",
    "apps/web/components/profile-workspace.tsx",
    "apps/web/lib/recommendation-profile.mjs",
    "apps/web/lib/job-user-view.mjs",
    "supabase/migrations/0011_daily_application_queue.sql",
    "supabase/migrations/0014_complete_platform_job_pool.sql",
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

sources = (ROOT / "apps/web/lib/job-sources.mjs").read_text(encoding="utf-8")
for provider in ["greenhouse", "lever", "ashby"]:
    assert provider in sources

migration = (ROOT / "supabase/migrations/0014_complete_platform_job_pool.sql").read_text(encoding="utf-8")
for token in ["job_user_overrides", "visibility", "scope", "jobs_pool_select", "evaluations_user_job_uidx", "applications_user_job_uidx"]:
    assert token in migration
assert "DROP TABLE" not in migration.upper()
assert "DROP SCHEMA" not in migration.upper()

for forbidden in ["node_modules", ".next", ".open-next", ".wrangler", ".pytest_cache", "__pycache__"]:
    assert not any(p.name == forbidden for p in ROOT.rglob("*")), f"transient directory included: {forbidden}"

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
    text = path.read_text(encoding="utf-8", errors="ignore")
    for pattern in secret_patterns:
        assert not pattern.search(text), f"possible secret in {path.relative_to(ROOT)}"

print(json.dumps({
    "ok": True,
    "required_files": len(required),
    "navigation_items": 8,
    "automatic_sources": ["greenhouse", "lever", "ashby"],
    "neutral_profile_defaults": True,
    "destructive_migration": False,
}, ensure_ascii=False, indent=2))
