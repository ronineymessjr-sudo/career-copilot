# Deployment handoff — Milestone 07

Version: `0.9.0`
Implementation commit: `23bad880007cca4b213633c34b6e428551055ec8`

## 1. Restore and push

Use the exact Git Bundle shipped with this release:

```bash
git clone Career_Copilot_V2_Cloudflare_Milestone_07.bundle career-copilot-v2
cd career-copilot-v2
git remote set-url origin https://github.com/ronineymessjr-sudo/public-apis-resource.git
git push origin main
```

## 2. Apply database migration

Apply `supabase/migrations/0007_knowledge_graph_workflows.sql` after migrations 0001–0006.

Confirm:

- the `vector` extension is available;
- RLS is enabled on all six new tables;
- the `match_career_chunks` function is `SECURITY INVOKER`;
- authenticated users can access only their own documents, chunks and workflow state.

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

Optional semantic retrieval:

```text
OPENAI_API_KEY
```

The Worker defaults to `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`. Without the key, the product remains functional through lexical fallback.

Optional read-only authenticated production E2E:

```text
CAREER_COPILOT_TEST_EMAIL
CAREER_COPILOT_TEST_PASSWORD
```

Use a dedicated private test user. Do not paste credentials or tokens into chat, issues or source files.

## 4. Expected runtime response

```json
{
  "version": "0.9.0",
  "authRequired": true,
  "documentKnowledgeBase": true,
  "pgvectorRetrieval": true,
  "citationRequired": true,
  "durableHumanInterrupts": true,
  "automaticEvidencePromotion": false,
  "automaticSubmission": false,
  "automaticInterviewAcceptance": false,
  "automaticOfferAcceptance": false
}
```

## 5. Production acceptance

1. Anonymous `/api/control/knowledge/documents` returns 401.
2. Login succeeds with the private test account.
3. Ingest a unique text document and record its document/chunk IDs.
4. Search a known phrase and inspect the cited document, chunk, hash and character range.
5. Confirm the response says `vector` when embeddings exist or `lexical` when they do not.
6. Start an evidence-promotion workflow and confirm it pauses.
7. Close and reopen the workspace, then resume the same workflow.
8. Reject once and verify no verified fact is created.
9. Start a fresh workflow and approve once; verify exactly one verified Career Vault fact.
10. Start another workflow, archive its source, and verify resume is blocked as stale.
11. Run `scripts/production_e2e_m07.mjs` and confirm `mutations_performed: false`.
12. Download GitHub Actions artifacts: runtime, anonymous-route evidence, Cron evidence, E2E result and `DEPLOYED_URLS.json`.
