# Online status — Milestone 07

Updated: `2026-07-24`
Version: `0.9.0`
Implementation commit: `23bad880007cca4b213633c34b6e428551055ec8`

## Completed in the release source

- private document ingestion and deterministic chunk provenance;
- pgvector schema, HNSW index and cited retrieval RPC;
- optional OpenAI embeddings with explicit lexical fallback;
- LangGraph durable checkpoints, pending writes and human interrupts;
- authenticated knowledge and workflow control routes;
- approve, edit and reject evidence-promotion decisions;
- stale-source revalidation before Career Vault promotion;
- private knowledge workspace;
- read-only authenticated production E2E;
- migration 0007 with owner RLS;
- local deterministic, static, Python and offline Smoke validation.

## Existing public deployment

The user previously confirmed the public Worker URL is accessible:

`https://career-copilot-v2.photomagic.workers.dev`

This execution environment cannot resolve that Worker domain or install npm dependencies. It therefore does not claim that version 0.9.0 is currently live.

## Required live evidence

- GitHub `main` contains the Milestone 07 release commit.
- Supabase migrations 0001–0007 are applied.
- `/api/runtime` reports `0.9.0` and all knowledge/safety flags.
- Anonymous knowledge routes return 401.
- Text ingestion writes user-owned documents and chunks.
- Search returns citations and explicitly reports vector or lexical mode.
- A workflow survives page/process restart and resumes with the same thread.
- Rejection creates no Career Vault evidence.
- Approval creates verified evidence only after explicit review.
- Archived, deleted or changed source material blocks stale approval.
- The read-only authenticated E2E passes or records an explicit skipped reason.
