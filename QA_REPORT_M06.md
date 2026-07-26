# QA Report — Milestone 06

Date: `2026-07-24`
Version: `0.8.0`

## Deterministic Node tests

- Core control rules: **12 passed**
- Source and export rules: **6 passed**
- Interview and analytics rules: **8 passed**
- Total: **26 passed**

Validated behavior includes:

- preparation uses verified evidence only;
- draft evidence is excluded;
- low-rated feedback creates a skill gap;
- repeated feedback/gap writes use deterministic upsert identities;
- pre-submission rejection is not counted as submitted;
- funnel counts reconcile;
- weekly review is advisory only;
- interview and Offer status changes require explicit user confirmation.

## Backend and frontend

- FastAPI tests: **10 passed**
- Python compilation: passed
- Web TypeScript/TSX static transpilation: **60 files passed**
- Scheduler TypeScript static transpilation: **1 file passed**
- Cloudflare release validator: passed
- GitHub Actions YAML parsing: passed
- Deployment shell syntax: passed
- JSON validation: passed

## Database and security review

- Migration `0006_interview_learning_analytics.sql` contains RLS and owner policies for every new exposed table.
- Browser and admin analytics queries explicitly filter by `user_id`.
- No `SECURITY DEFINER` function is introduced.
- Feedback and skill gaps use conflict-safe upserts.
- Production E2E evidence excludes credentials and access tokens.
- No automatic interview acceptance, Offer acceptance, email sending or final application submission exists.

## Smoke result

`SMOKE_RESULT_M06.json` verifies:

1. verified evidence is used for interview preparation;
2. draft evidence is excluded;
3. weak answers create skill gaps;
4. rejected-before-submission records do not inflate submission metrics;
5. interview/Offer funnel counts reconcile;
6. weekly review performs no automatic action;
7. status changes require explicit confirmation.

## Unavailable in this sandbox

- `npm install` timed out against the package registry.
- Full `tsc --noEmit`, Next.js build and OpenNext production build were therefore not run here.
- Real Supabase migration 0006 and live Cloudflare authenticated E2E require the authorized production environment.
