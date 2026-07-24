#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET_REPO_URL="${TARGET_REPO_URL:-https://github.com/ronineymessjr-sudo/public-apis-resource.git}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
PUSH_GITHUB="${PUSH_GITHUB:-1}"
REQUIRE_GITHUB_PUSH="${REQUIRE_GITHUB_PUSH:-0}"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1" >&2; exit 1; }
}
need node
need npm
need git
need curl

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "No CLOUDFLARE_API_TOKEN found; checking existing Wrangler OAuth login..."
  npx wrangler whoami >/dev/null
elif [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN is set but CLOUDFLARE_ACCOUNT_ID is missing." >&2
  exit 1
fi

if [[ -z "${CRON_SHARED_SECRET:-}" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    CRON_SHARED_SECRET="$(openssl rand -hex 32)"
  else
    CRON_SHARED_SECRET="$(python - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
)"
  fi
fi
export CRON_SHARED_SECRET

npm install --no-audit --no-fund
npm --workspace apps/web run cf-typegen
npm --workspace workers/scheduler run cf-typegen
npm run check
python scripts/validate_cloudflare.py
python -m compileall -q apps/api/app apps/api/scripts
npm --workspace apps/web run build
npm --workspace apps/web run cf:build

if [[ "$PUSH_GITHUB" == "1" ]]; then
  if [[ ! -d .git ]]; then
    git init -b "$TARGET_BRANCH"
  fi
  git config user.name "Career Copilot Release Bot"
  git config user.email "actions@users.noreply.github.com"
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$TARGET_REPO_URL"
  else
    git remote add origin "$TARGET_REPO_URL"
  fi

  remote_refs="$(git ls-remote --heads origin 2>/dev/null || true)"
  if [[ -n "$remote_refs" ]] && ! git rev-parse --verify HEAD >/dev/null 2>&1; then
    echo "Target repository is no longer empty; refusing to overwrite it." >&2
    exit 1
  fi

  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "feat: launch Career Copilot V2 on Cloudflare"
  fi
  git branch -M "$TARGET_BRANCH"
  if ! git push -u origin "$TARGET_BRANCH"; then
    if [[ "$REQUIRE_GITHUB_PUSH" == "1" ]]; then
      echo "GitHub push failed and REQUIRE_GITHUB_PUSH=1." >&2
      exit 1
    fi
    echo "Warning: GitHub push failed; continuing with direct Cloudflare deployment." >&2
  fi
fi

WEB_LOG="$(mktemp)"
(
  cd apps/web
  npx opennextjs-cloudflare deploy 2>&1 | tee "$WEB_LOG"
  printf '%s' "$CRON_SHARED_SECRET" | npx wrangler secret put CRON_SHARED_SECRET
)

WEB_URL="${WEB_URL:-$(grep -Eo 'https://[A-Za-z0-9.-]+\.workers\.dev' "$WEB_LOG" | tail -1 || true)}"
if [[ -z "$WEB_URL" ]]; then
  echo "Web Worker deployed, but its public URL could not be parsed." >&2
  echo "Set WEB_URL to the workers.dev URL and rerun with PUSH_GITHUB=0." >&2
  exit 1
fi

SCHED_LOG="$(mktemp)"
(
  cd workers/scheduler
  npx wrangler deploy 2>&1 | tee "$SCHED_LOG"
  printf '%s' "$CRON_SHARED_SECRET" | npx wrangler secret put CRON_SHARED_SECRET
)
SCHEDULER_URL="$(grep -Eo 'https://[A-Za-z0-9.-]+\.workers\.dev' "$SCHED_LOG" | tail -1 || true)"

curl --fail --silent --show-error "$WEB_URL/api/runtime" | tee /tmp/career-copilot-runtime.json
printf '\n'
if [[ -n "$SCHEDULER_URL" ]]; then
  curl --fail --silent --show-error "$SCHEDULER_URL/health" | tee /tmp/career-copilot-scheduler-health.json
  printf '\n'
fi
curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer $CRON_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"source":"post-deploy-smoke"}' \
  "$WEB_URL/api/cron/daily" | tee /tmp/career-copilot-cron-smoke.json
printf '\n'

cat > DEPLOYED_URLS.json <<JSON
{
  "web_url": "$WEB_URL",
  "scheduler_url": "$SCHEDULER_URL",
  "runtime_check": "$WEB_URL/api/runtime",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

cat <<OUT
Deployment complete.
Web:       $WEB_URL
Scheduler: ${SCHEDULER_URL:-see Wrangler output}
Repository: $TARGET_REPO_URL
The generated CRON_SHARED_SECRET was applied to both Workers and was not printed.
OUT
