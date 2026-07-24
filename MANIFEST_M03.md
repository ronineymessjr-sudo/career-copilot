# Milestone 03 Manifest

Version: 0.4.0

## Major additions

- `apps/api/app/integrations/supabase_rest.py`
- `apps/api/app/supabase_sync.py`
- `apps/api/app/git_evidence.py`
- `apps/api/app/benchmark.py`
- `apps/api/scripts/collect_git_evidence.py`
- `apps/api/scripts/run_model_benchmark.py`
- `apps/api/tests/test_milestone03.py`
- `apps/web/lib/api.ts`
- `.github/workflows/engineering-evidence.yml`
- `supabase/migrations/0003_supabase_runtime_ci_benchmarks.sql`
- `docs/MILESTONE_03.md`
- `SMOKE_RESULT_M03.json`

## Verification

- 10 backend tests passed
- 17 TypeScript/TSX files validated
- Workflow YAML parsed
- Migration static RLS checks passed
- Milestone 03 smoke test passed
- No external model request was made
- No real Supabase request was made without credentials
