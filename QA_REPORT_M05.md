# QA Report — Milestone 05

Date: `2026-07-24`
Version: `0.7.0`

## Automated verification

- Deterministic control rules: **12 passed**.
- Greenhouse, Lever and export tests: **6 passed**.
- Total Node deterministic tests: **18 passed**.
- FastAPI suite: **10 passed**.
- Python compilation: passed.
- TypeScript/TSX transpilation validation: **48 files passed**.
- Cloudflare Milestone 05 static validator: passed.
- GitHub Actions YAML parsing: passed.
- Deployment shell syntax: passed.
- Offline Milestone 05 end-to-end smoke: passed.

## Production integrity checks

- Stable provider job identity prevents mutable JD text from creating duplicates.
- Official ATS domains are hard-coded, closing the user-controlled URL / SSRF path.
- Public source requests use timeout and response-size limits.
- User-verified HR fields survive later source refreshes.
- Manual re-import also preserves verified fields.
- Application readiness is recalculated from the latest job and Career Vault state.
- Material preparation recalculates eligibility instead of trusting a stale stored score.
- Export and Gmail draft creation recheck current eligibility and referenced evidence.
- Gmail integration creates drafts only; repository scan found no send endpoint.
- Final `submitted` transition still requires explicit user confirmation.
- Supabase `sb_secret_*` is passed via `apikey` only and never treated as a JWT bearer token.

## Offline smoke assertions

- Greenhouse payload parsed.
- Source filters applied.
- Verified evidence only.
- HR-verified values preserved through refresh.
- Official ATS hosts only.
- Material safety metadata present.
- Gmail MIME message generated as draft-only.
- Final submission without confirmation rejected.

## Full build status

`npm install --no-audit --no-fund` was attempted in this execution environment and timed out while reaching the npm registry. Consequently, the following are not claimed here:

- dependency-resolved `tsc --noEmit`;
- `next build`;
- OpenNext production build;
- live Cloudflare deployment of 0.7.0.

The GitHub workflow and deployment script execute those gates in a networked authorized environment.

## Live acceptance still required

- Apply migration 0005 to the real Supabase project.
- Confirm all seven deployment secrets are present.
- Redeploy the Web and Scheduler Workers.
- Validate `/api/runtime` version 0.7.0.
- Run authenticated source discovery.
- Validate Google identity linking and Gmail draft creation.
- Confirm the Gmail message remains in Drafts and is not sent.
