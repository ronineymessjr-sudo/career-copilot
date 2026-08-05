# Cloudflare deployment — Career Copilot V2 1.0.1

## Pre-deploy

1. Confirm Supabase migrations `0001–0008` are applied.
2. Configure required Cloudflare, Supabase and Cron secrets.
3. Optionally configure `OPENAI_API_KEY`.
4. Run the Milestone 08.1 CI gates.

## Deploy

```bash
npm install --no-audit --no-fund
npm run test:m08.1
npm run evaluation:m08.1
npm run smoke:m08.1
npm run check
python -m pytest apps/api/tests -q
python scripts/validate_cloudflare.py
npm --workspace apps/web run cf:build
npm --workspace apps/web run deploy
npm --workspace workers/scheduler run deploy
```

## Post-deploy

- `/api/runtime` reports `1.0.1`.
- `/playground` returns 200 without authentication.
- `/api/control/jobs` returns 401 without authentication.
- `automaticSubmission` and `automaticEmailSend` remain false.
- Daily and weekly Cron endpoints pass authenticated Smoke checks.
