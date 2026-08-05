# QA Report — Milestone 07

Date: `2026-07-24`
Version: `0.9.0`
Implementation commit: `23bad880007cca4b213633c34b6e428551055ec8`

## Deterministic Node tests

- Core control rules: **12 passed**
- Source and export rules: **6 passed**
- Interview and analytics rules: **8 passed**
- Knowledge and workflow rules: **6 passed**
- Total: **32 passed**

Validated behavior includes:

- chunk ranges and overlap are deterministic;
- identical source text has a stable hash;
- lexical fallback ranks matching content without claiming vector retrieval;
- every retrieval context requires human verification;
- evidence promotion is never automatic;
- edited approvals require complete evidence fields;
- previous application, interview and submission safety regressions remain green.

## Backend and frontend

- FastAPI tests: **10 passed**
- Python compilation: passed
- Web TypeScript/TSX static transpilation: **70 files passed**
- Scheduler TypeScript static transpilation: **1 file passed**
- MJS syntax validation: passed
- Cloudflare release validator: passed
- GitHub Actions YAML parsing: passed
- deployment shell syntax: passed
- JSON validation and offline Smoke: passed

## Database and security review

- Migration `0007_knowledge_graph_workflows.sql` enables pgvector and RLS for every new exposed table.
- All document, chunk, thread, checkpoint and write records carry user ownership.
- Vector search uses a `SECURITY INVOKER` function and explicit user filtering.
- No `SECURITY DEFINER` function is introduced.
- The OpenAI key is server-only and does not appear in browser components.
- Checkpoint serialization rejects unsafe prototype keys and validates identifiers.
- Workflow resume revalidates source status and content hash before promotion.
- Rejected or stale candidates cannot create verified Career Vault evidence.
- No automatic application submission, interview acceptance, Offer acceptance or evidence promotion exists.

## Smoke result

`SMOKE_RESULT_M07.json` verifies:

1. document chunking and provenance;
2. lexical fallback;
3. cited source identity and ranges;
4. human-verification requirements;
5. rejection without promotion;
6. explicit approval requirements;
7. durable interrupt/checkpoint code paths;
8. pgvector RPC presence;
9. all automatic-action flags remain false.

## Unavailable in this sandbox

- npm dependency installation returned an upstream registry error/time-out.
- Full `tsc --noEmit`, Next.js build and OpenNext production build were not run here.
- Real Supabase migration 0007, live vector embeddings, Cloudflare 0.9.0 deployment and live durable-interrupt E2E remain production-environment gates.
