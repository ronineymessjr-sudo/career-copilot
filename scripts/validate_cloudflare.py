from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    ROOT / "apps/web/wrangler.jsonc",
    ROOT / "apps/web/open-next.config.ts",
    ROOT / "apps/web/app/api/runtime/route.ts",
    ROOT / "apps/web/app/api/cron/daily/route.ts",
    ROOT / "workers/scheduler/wrangler.jsonc",
    ROOT / "workers/scheduler/src/index.ts",
    ROOT / ".github/workflows/cloudflare-deploy.yml",
]

for path in REQUIRED:
    if not path.exists():
        raise SystemExit(f"missing required file: {path.relative_to(ROOT)}")

json.loads((ROOT / "package.json").read_text())
json.loads((ROOT / "apps/web/package.json").read_text())
json.loads((ROOT / "workers/scheduler/package.json").read_text())

def parse_jsonc(path: Path):
    text = path.read_text()
    text = re.sub(r"//.*?$", "", text, flags=re.M)
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return json.loads(text)

web = parse_jsonc(ROOT / "apps/web/wrangler.jsonc")
scheduler = parse_jsonc(ROOT / "workers/scheduler/wrangler.jsonc")
assert web["main"] == ".open-next/worker.js"
assert "nodejs_compat" in web["compatibility_flags"]
assert scheduler["triggers"]["crons"] == ["0 11 * * *"]
assert scheduler["services"] == [{"binding": "WEB", "service": "career-copilot-v2"}]
assert "DAILY_RUN_URL" not in (ROOT / "workers/scheduler/src/index.ts").read_text()
assert "wrangler secret put CRON_SHARED_SECRET" in (ROOT / "scripts/deploy_cloudflare.sh").read_text()

forbidden = [
    re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    re.compile(r"BEGIN PRIVATE KEY"),
    re.compile(r"ronineymessjr@gmail\.com", re.I),
]
for path in ROOT.rglob("*"):
    if path == Path(__file__).resolve():
        continue
    if not path.is_file() or path.suffix.lower() in {".png", ".jpg", ".jpeg", ".zip", ".docx", ".pyc"}:
        continue
    text = path.read_text(errors="ignore")
    for pattern in forbidden:
        if pattern.search(text):
            raise SystemExit(f"forbidden public content in {path.relative_to(ROOT)}: {pattern.pattern}")

print("cloudflare release validation passed")
