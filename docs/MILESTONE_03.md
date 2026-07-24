# Milestone 03 — Supabase Sync, Git/CI Evidence, Model Benchmarks

Date: 2026-07-23  
Version: 0.4.0

## Goal

Turn the engineering-evidence prototype into an auditable local-first system that can be connected to Supabase and CI without fabricating production claims.

## Completed

### Supabase local-first data bridge

- Added a backend-only PostgREST client.
- Added `GET /api/supabase/health`.
- Added protected `POST /api/supabase/sync`.
- Synchronizes jobs, evaluations, application packages, applications, model runs, and delivery runs.
- Every synchronized row receives `user_id`.
- Supports a separate project API key and user access token.
- Keeps SQLite as the recovery source when Supabase is not configured.

This milestone implements scheduled/manual dual-write synchronization. It does **not** yet switch every runtime read to Supabase or complete end-user Auth UI.

### Supabase security migration

`supabase/migrations/0003_supabase_runtime_ci_benchmarks.sql` adds:

- user ownership columns;
- per-user conflict keys;
- RLS on all exposed application tables;
- ownership policies using `auth.uid()`;
- explicit Data API grants;
- model benchmark records;
- CI evidence metadata.

### Git and CI evidence

- Records commit SHA, branch, changed files, insertions, deletions, JUnit tests, and CI run URL.
- Does not infer which lines were written by AI.
- Stores AI-generated and human-edited line attribution as zero unless a verified source provides it.
- GitHub Actions workflow uploads evidence artifacts for 30 days.
- Optional protected ingestion into a deployed Career Copilot API.

### Model benchmark ledger

- Added protected `POST /api/model/benchmarks`.
- Added `GET /api/model/benchmarks`.
- Supports Mock, Ollama, and OpenAI-compatible/vLLM providers through the existing gateway.
- Mock results are stored as `is_demo=true`, `comparable=false`, with no semantic quality score.
- Real model results become comparable only if every case completes.

### Frontend

The engineering workspace now displays:

- Supabase connection state;
- Git/CI automated evidence totals;
- model benchmark status;
- real API data with a clearly labeled demo fallback;
- no false claim that Mock latency is a real model benchmark.

## Protected write endpoints

The following require `X-Admin-Token` matching `CAREER_COPILOT_ADMIN_TOKEN`:

- `POST /api/model/generate`
- `POST /api/model/benchmarks`
- `POST /api/engineering/delivery-runs`
- `POST /api/engineering/git-evidence`
- `POST /api/supabase/sync`

## Verification

- Backend tests: 10 passed.
- Python compilation: passed.
- TypeScript/TSX validation: 17 files passed.
- Mock benchmark: 4/4 transport cases succeeded, explicitly non-comparable.
- Git smoke evidence: 1 changed file, JUnit 4/4, attribution `unknown`.
- Unauthorized benchmark request: HTTP 401.
- External model requests during smoke test: false.
