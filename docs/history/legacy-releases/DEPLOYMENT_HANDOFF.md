# Deployment handoff — Milestone 08.1

Version: `1.0.1`

## Required source

Deploy the final Milestone 08.1 release commit from `main`.

## Database

No new database migration is required. Confirm migrations `0001` through `0008` are already applied.

## Required secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CRON_SHARED_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `OWNER_USER_ID`

Optional:

- `OPENAI_API_KEY`
- production test-account credentials used only by protected GitHub Actions E2E

## CI gates

```bash
npm install --no-audit --no-fund
npm run test:m08.1
npm run evaluation:m08.1
npm run smoke:m08.1
npm run check
python -m pytest apps/api/tests -q
python scripts/validate_cloudflare.py
npm --workspace apps/web run build
npm --workspace apps/web run cf:build
```

## Runtime acceptance

`/api/runtime` must report:

```json
{
  "version": "1.0.1",
  "publicPortfolioPlayground": true,
  "deterministicAgentDemoApi": true,
  "dockerDemoStack": true,
  "resumePersonas": [
    "agent_engineer",
    "ai_product",
    "ai_solution",
    "local_transition"
  ],
  "automaticEmailSend": false,
  "automaticSubmission": false
}
```

## Public acceptance

- `GET /playground` returns 200 without authentication.
- The sample JD produces an Agent analysis in the browser.
- A full-time JD remains blocked.
- `GET /api/control/jobs` without a Bearer token returns 401.

## FastAPI demo acceptance

```bash
curl -sS http://localhost:8000/health
curl -sS -X POST http://localhost:8000/agent/analyze-job \
  -H 'Content-Type: application/json' \
  --data '{"jd_text":"AI Agent实习生，接受2028届，使用Python、FastAPI、LangGraph和RAG，每周至少3天，至少3个月。"}'
```

## Docker demo

```bash
docker compose up --build
```

This path is for local demonstrations. Cloudflare Workers + Supabase remain the production topology.
