# Milestone 07 — Cited Career Vault Knowledge and Durable Human Workflows

Version: `0.9.0`  
Date: `2026-07-24`

## Goal

Turn Career Vault from manually entered facts into a source-backed private knowledge workspace. Documents can be ingested, chunked, retrieved and cited, but retrieval never becomes verified career evidence automatically. Evidence promotion runs through a durable LangGraph interrupt that can be reviewed and resumed after the page or Worker process has ended.

## Delivered

### Private document knowledge base

- User-owned source documents with title, source type, source URI, content hash, active/archive state and ingestion metadata.
- Plain-text ingestion for pasted text and browser-readable `.txt`, `.md`, `.markdown`, `.json` and `.csv` files.
- Explicit rejection of fake PDF/DOCX parsing: unsupported binary documents must be converted to text first.
- Deterministic chunking with overlap, stable hashes, character ranges and document/chunk provenance.
- Duplicate document protection by user and source content hash.
- Document archive, restore and delete operations.

### Cited retrieval

- PostgreSQL `pgvector` storage using 1536-dimensional embeddings.
- HNSW vector index and a user-scoped `SECURITY INVOKER` retrieval function.
- Optional OpenAI `text-embedding-3-small` generation through a Worker secret.
- Transparent lexical ranking fallback when no embedding key is configured or embeddings are unavailable.
- Every retrieval result includes document identity, chunk identity, content hash and character range.
- Retrieved context is marked `retrieval_only` and `requires_human_verification`.

### Durable evidence-promotion workflow

- LangGraph workflow with validation, human interrupt and finalize nodes.
- Supabase-backed checkpoint and pending-write storage.
- Stable `thread_id` and user-owned workflow thread records.
- Review actions: approve, edit and approve, or reject.
- Approved or edited evidence is promoted to `verified` Career Vault only after an explicit decision.
- Rejected evidence writes nothing to Career Vault.
- Source document status and content hash are revalidated when the workflow resumes, blocking stale approvals.
- No workflow is allowed to mark an application submitted or accept an interview or Offer.

### Private knowledge workspace

The authenticated `/knowledge` workspace supports:

1. ingesting and managing documents;
2. searching with vector or lexical retrieval;
3. inspecting citations and source ranges;
4. starting an evidence-promotion workflow from a cited chunk;
5. closing and reopening the workspace while the review remains durable;
6. approving, editing or rejecting pending evidence.

## Database migration

Apply migrations in order:

1. `0001_core.sql`
2. `0002_engineering_evidence.sql`
3. `0003_supabase_runtime_ci_benchmarks.sql`
4. `0004_cloudflare_control_plane.sql`
5. `0005_discovery_exports_gmail.sql`
6. `0006_interview_learning_analytics.sql`
7. `0007_knowledge_graph_workflows.sql`

Migration 0007 adds:

- `career_documents`
- `career_chunks`
- `workflow_threads`
- `workflow_checkpoints`
- `langgraph_checkpoints`
- `langgraph_writes`
- `match_career_chunks`
- pgvector, HNSW and lexical indexes
- user ownership, RLS and explicit authenticated grants

No `SECURITY DEFINER` function is introduced.

## Configuration

Required production configuration remains unchanged from Milestone 06. Semantic embeddings are optional:

```text
OPENAI_API_KEY
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Without `OPENAI_API_KEY`, ingestion and search remain available through deterministic lexical fallback. The system does not pretend that lexical results are vector results.

## Production acceptance

1. `/api/runtime` returns version `0.9.0` and all knowledge/safety flags.
2. Anonymous `/api/control/knowledge/documents` returns 401.
3. Migrations 0001–0007 are present on the real Supabase project.
4. Ingest a text document and verify stable document/chunk provenance.
5. Search for a known statement and verify every result includes a citation and source range.
6. Confirm vector mode when embeddings are configured, or explicit lexical fallback otherwise.
7. Start an evidence-promotion workflow and verify it pauses for human review.
8. Close and reopen the browser, then resume the same workflow thread.
9. Reject the candidate and verify no Career Vault record is created.
10. Approve a fresh candidate and verify exactly one `verified` Career Vault fact is created.
11. Archive or modify the source before resume and verify stale approval is blocked.
12. Confirm `automaticEvidencePromotion`, `automaticSubmission`, `automaticInterviewAcceptance` and `automaticOfferAcceptance` are all false.
13. Run the read-only authenticated production E2E and inspect its redacted evidence.

## Verification boundary

The release source passes deterministic knowledge tests, prior milestone regressions, static TypeScript transpilation, FastAPI tests, migration/security validation, workflow parsing and offline Smoke. This sandbox could not install npm dependencies, so full TypeScript typecheck, Next.js/OpenNext production builds, real migration 0007, live embeddings and a live durable-interrupt E2E remain production-environment gates.
