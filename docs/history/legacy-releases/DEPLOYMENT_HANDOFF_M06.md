# Deployment handoff — Milestone 06

Implementation commit: `c3292fdb54430baf3f020fa22732f1fb15e7e51e`

## 1. Restore and push

```bash
git clone Career_Copilot_V2_Cloudflare_Milestone_06.bundle career-copilot-v2
cd career-copilot-v2
git remote set-url origin https://github.com/ronineymessjr-sudo/public-apis-resource.git
git push origin main
```

## 2. Apply database migration

Apply `supabase/migrations/0006_interview_learning_analytics.sql` after migrations 0001–0005.

Confirm RLS is enabled on:

- `interview_feedback`
- `skill_gaps`
- `weekly_reviews`
- `operational_events`

## 3. Required GitHub Secrets

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
CRON_SHARED_SECRET
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
OWNER_USER_ID
```

Optional authenticated production E2E:

```text
CAREER_COPILOT_TEST_EMAIL
CAREER_COPILOT_TEST_PASSWORD
```

Use a dedicated private test user. Do not paste these credentials into chat or commit them.

## 4. Expected schedules

```text
0 11 * * *   daily public job discovery
0 12 * * 0   weekly review generation
```

## 5. Expected runtime response

```json
{
  "version": "0.8.0",
  "authRequired": true,
  "interviewLearningLoop": true,
  "conversionAnalytics": true,
  "weeklyReviews": true,
  "operationalObservability": true,
  "automaticSubmission": false,
  "automaticInterviewAcceptance": false,
  "automaticOfferAcceptance": false
}
```

## 6. Production acceptance

- Anonymous control routes return 401.
- Login succeeds.
- Interview preparation excludes draft/disabled Career Vault evidence.
- Weak feedback creates one upserted skill gap.
- Status changes remain unchanged when explicit confirmation is declined.
- Analytics correctly excludes rejection before submission.
- Weekly review has `automatic_actions: false`.
- GitHub Actions uploads `PRODUCTION_E2E_M06.json` without credentials or tokens.
