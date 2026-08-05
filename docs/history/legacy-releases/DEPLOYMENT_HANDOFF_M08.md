# Deployment handoff — Milestone 08

Version: `1.0.0`
Implementation commit: `2803ac0043b10fb95816f4baff4e61531a438bd9`

## 1. Restore the exact release

```bash
git clone Career_Copilot_V2_Cloudflare_Milestone_08.bundle career-copilot-v2
cd career-copilot-v2
git log -1 --oneline
```

The final release commit SHA is recorded in `MANIFEST_M08.md` and the external release evidence JSON.

## 2. Bind and push the dedicated repository

```bash
git remote set-url origin https://github.com/ronineymessjr-sudo/public-apis-resource.git
git push origin main
```

Do not push this release to another repository.

## 3. Apply the database migration

Confirm migrations 0001–0007 exist, then apply:

```text
supabase/migrations/0008_agent_runtime_mcp_evaluation.sql
```

Validate:

- all new tables are visible to the Data API only with authenticated grants;
- RLS is enabled;
- the private test user cannot read another user's Agent records;
- resume version uniqueness is valid after the backfill.

## 4. Configure deployment secrets

Required:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CRON_SHARED_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OWNER_USER_ID
```

Optional embeddings:

```text
OPENAI_API_KEY
```

Optional read-only authenticated E2E:

```text
CAREER_COPILOT_TEST_EMAIL
CAREER_COPILOT_TEST_PASSWORD
```

Never commit or paste these values into source code, logs or chat.

## 5. Build and deploy

GitHub Actions runs automatically on `main`. A manually authenticated environment may run:

```bash
./scripts/deploy_cloudflare.sh
cat DEPLOYED_URLS.json
```

The script installs dependencies, runs 46 deterministic Node tests, 10 FastAPI tests, typechecks, builds Next.js/OpenNext, deploys the web and scheduler Workers, applies secrets, calls daily/weekly Cron and validates runtime flags.

## 6. Runtime target

```text
https://career-copilot-v2.photomagic.workers.dev/api/runtime
```

Expected core fields:

```json
{
  "version": "1.0.0",
  "authRequired": true,
  "agentRuntime": true,
  "hybridJobRanking": true,
  "resumePersonas": ["agent_engineer", "ai_product", "ai_solution"],
  "mcpServer": true,
  "mcpProtocolVersion": "2025-06-18",
  "agentEvaluation": true,
  "automaticEmailSend": false,
  "automaticSubmission": false,
  "automaticInterviewAcceptance": false,
  "automaticOfferAcceptance": false
}
```

## 7. Production acceptance

1. Anonymous `/api/control/agents/run`, ranking, resumes and evaluations return 401.
2. The dedicated test account can read its Agent runs, scores and resumes.
3. Rank a normal eligible job and verify score components, citations and grade.
4. Rank a hard-blocked job and verify its final score stays below 50.
5. Generate each resume persona and verify every evidence reference points to an active verified fact.
6. Call MCP `initialize`, `tools/list` and a read-only tool with bearer authentication.
7. Call `create_email_draft` and `update_application_status`; both must require a separate approval and perform no mutation.
8. Inspect one Agent trace and one evaluation record.
9. Trigger daily Cron and verify discovery, ranking and report results with `automatic_submission: false`.
10. Download and review `DEPLOYED_URLS.json` and `PRODUCTION_E2E_M08.json`.
