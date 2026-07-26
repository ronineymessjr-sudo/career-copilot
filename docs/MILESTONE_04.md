# Milestone 04 — Cloudflare Native Application Control Plane

Version: `0.6.0`

## Delivered

- Supabase email/password authentication for the private workspace.
- User-scoped Cloudflare Route Handlers using the Supabase access token and RLS.
- Career Vault with explicit `draft`, `verified`, and `rejected` evidence states.
- Deterministic JD intake and 2028-graduation hard rules.
- Job scoring that only counts verified, active evidence.
- Application package generation with evidence references and truth checks.
- Approval gate that creates `ready_to_submit`, never `submitted`.
- Separate explicit user confirmation before an application is recorded as submitted.
- Application event ledger for auditable state changes.
- Interactive Jobs, Career Vault, Applications, and Login pages.

## Production migration order

Apply the migrations in order:

1. `0001_core.sql`
2. `0002_engineering_evidence.sql`
3. `0003_supabase_runtime_ci_benchmarks.sql`
4. `0004_cloudflare_control_plane.sql`

Create the single-user account in Supabase Auth. Do not expose a service-role key to the browser or the Worker.

## Safety boundary

The system can prepare materials and record workflow state. It does not log into recruitment platforms, bypass CAPTCHA, send messages, or click final submission. Approval means the package is truthful and ready; it does not mean the application was submitted.

## Verification boundary

Source-code validation and deterministic rule tests are included. A live production claim still requires a real `workers.dev` URL, a successful `/api/runtime` response, applied Supabase migrations, and an authenticated end-to-end smoke test.
