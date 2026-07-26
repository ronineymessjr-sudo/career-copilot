# Milestone 06 — Interview Learning, Conversion Analytics and Production E2E

Version: `0.8.0`  
Date: `2026-07-24`

## Goal

Complete the post-application operating loop: prepare for interviews from verified evidence, capture structured feedback, convert weaknesses into actionable skill gaps, measure application conversion correctly, generate weekly reviews, and expose production health without automating interview or offer acceptance.

## Delivered

### Interview operating loop

- User-owned interview rounds with schedule, mode, type, interviewer, status and outcome.
- Deterministic preparation plans based on the latest job, latest evaluation, approved application package, verified Career Vault evidence and unresolved skill gaps.
- Preparation output includes focus areas, likely questions, verified project stories, risks and a checklist.
- Draft or disabled evidence is excluded.
- Interview completion records questions, ratings, notes and outcome.
- Low-rated or weak answers create or refresh skill gaps.
- Repeated completion upserts feedback and gaps instead of duplicating them.

### Explicit decision boundary

- Interview feedback can suggest an application status.
- A status change to `interview`, `offer` or `rejected` requires an explicit user confirmation flag.
- The system does not accept an interview invitation, next round or Offer.
- `submitted` retains its separate explicit confirmation rule.

### Conversion analytics

- Funnel stages: prepared → submitted → replied → interviewed → offered.
- Conversion rates use the preceding stage as denominator.
- A rejection that never reached `submitted` is not counted as a submission.
- Breakdown tables cover channel, location and resume version.
- Metrics are calculated from application state plus the audit event ledger.
- Background/admin reads explicitly filter every table by `user_id` even when the secret key bypasses RLS.

### Weekly review and observability

- Manual weekly review generation.
- Weekly Cloudflare Cron at `0 12 * * 0` UTC.
- Daily discovery remains at `0 11 * * *` UTC.
- Weekly output includes metrics, wins, risks, upcoming interviews and next actions.
- Weekly reviews never execute the proposed actions.
- Operational events capture key control-plane actions and duration.
- The analytics workspace shows source failures, control-plane failures and open skill gaps.

### Authenticated production E2E

The optional GitHub Actions test:

1. logs in through Supabase Auth using repository secrets;
2. verifies runtime version and safety flags;
3. verifies anonymous analytics access returns 401;
4. reads authenticated analytics and interviews;
5. generates a weekly review;
6. writes a redacted evidence JSON with no email, password or access token.

It does not create applications, submit materials, send email, accept interviews or accept Offers.

## Database migration

Apply in order:

1. `0001_core.sql`
2. `0002_engineering_evidence.sql`
3. `0003_supabase_runtime_ci_benchmarks.sql`
4. `0004_cloudflare_control_plane.sql`
5. `0005_discovery_exports_gmail.sql`
6. `0006_interview_learning_analytics.sql`

Migration 0006 adds or extends:

- `interviews` preparation and feedback fields
- `interview_feedback`
- `skill_gaps`
- `weekly_reviews`
- `operational_events`
- user ownership, RLS, explicit grants and deduplication indexes

## Production acceptance

1. `/api/runtime` returns `0.8.0` and all safety flags are correct.
2. Anonymous `/api/control/analytics` returns 401.
3. Login succeeds.
4. Create a scheduled interview for an already submitted/in-progress application.
5. Generate a preparation plan and confirm only verified evidence appears.
6. Complete a feedback item with rating 2 and confirm a skill gap is created.
7. Repeat the completion and confirm feedback/gaps are updated, not duplicated.
8. Decline the explicit status-change confirmation and confirm the application status remains unchanged.
9. Confirm the status change and verify the audit event.
10. Verify analytics funnel counts and breakdowns reconcile.
11. Generate a weekly review and confirm `automatic_actions: false`.
12. Run both protected Cron routes.
13. Run `scripts/production_e2e_m06.mjs` with a private test account.

## Verification boundary

The release package passes deterministic tests, static TypeScript transpilation, Python tests, migration/security validation, workflow parsing and offline Smoke. The current sandbox could not finish `npm install`, so `tsc --noEmit`, `next build`, OpenNext build, real migration 0006 and live authenticated E2E remain production-environment gates.
