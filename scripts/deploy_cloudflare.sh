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

for required_env in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY INTEGRATION_ENCRYPTION_KEY; do
  if [[ -z "${!required_env:-}" ]]; then
    echo "Missing required production variable: $required_env" >&2
    exit 1
  fi
done

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
npm run test:m08
npm run smoke:m08
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
  printf '%s' "$SUPABASE_SECRET_KEY" | npx wrangler secret put SUPABASE_SECRET_KEY
  printf '%s' "$NEXT_PUBLIC_SUPABASE_URL" | npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
  printf '%s' "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | npx wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  printf '%s' "$INTEGRATION_ENCRYPTION_KEY" | npx wrangler secret put INTEGRATION_ENCRYPTION_KEY
  if [[ -n "${GOOGLE_OAUTH_CLIENT_ID:-}${GOOGLE_OAUTH_CLIENT_SECRET:-}${GOOGLE_OAUTH_REDIRECT_URI:-}" ]]; then
    for required_env in GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET GOOGLE_OAUTH_REDIRECT_URI; do
      if [[ -z "${!required_env:-}" ]]; then echo "Incomplete Gmail OAuth configuration: $required_env is missing." >&2; exit 1; fi
    done
    printf '%s' "$GOOGLE_OAUTH_CLIENT_ID" | npx wrangler secret put GOOGLE_OAUTH_CLIENT_ID
    printf '%s' "$GOOGLE_OAUTH_CLIENT_SECRET" | npx wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
    printf '%s' "$GOOGLE_OAUTH_REDIRECT_URI" | npx wrangler secret put GOOGLE_OAUTH_REDIRECT_URI
  fi
  if [[ -n "${OPENAI_API_KEY:-}" ]]; then printf '%s' "$OPENAI_API_KEY" | npx wrangler secret put OPENAI_API_KEY; fi
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
python - <<'PY'
import json
data=json.load(open('/tmp/career-copilot-runtime.json',encoding='utf-8'))
assert data['version']=='1.0.1', data
assert data['interviewLearningLoop'] is True, data
assert data['conversionAnalytics'] is True, data
assert data['weeklyReviews'] is True, data
assert data['documentKnowledgeBase'] is True, data
assert data['pgvectorRetrieval'] is True, data
assert data['citationRequired'] is True, data
assert data['durableHumanInterrupts'] is True, data
assert data['automaticEvidencePromotion'] is False, data
assert data['agentRuntime'] is True, data
assert data['hybridJobRanking'] is True, data
assert data['mcpServer'] is True, data
assert data['agentEvaluation'] is True, data
assert data['publicPortfolioPlayground'] is True, data
assert data['deterministicAgentDemoApi'] is True, data
assert data['dockerDemoStack'] is True, data
assert 'local_transition' in data['resumePersonas'], data
assert data['automaticEmailSend'] is False, data
assert data['applicationOwnedIntegrations'] is True, data
assert data['automaticInterviewAcceptance'] is False, data
assert data['automaticOfferAcceptance'] is False, data
PY
curl --fail --silent --show-error --output /dev/null "$WEB_URL/playground"
status="$(curl --silent --output /tmp/career-copilot-anonymous-control.json --write-out '%{http_code}' "$WEB_URL/api/control/jobs")"
test "$status" = "401"
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
curl --fail --silent --show-error \
  -X POST \
  -H "Authorization: Bearer $CRON_SHARED_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"source":"post-deploy-smoke"}' \
  "$WEB_URL/api/cron/weekly" | tee /tmp/career-copilot-weekly-cron-smoke.json
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
