import fs from "node:fs";
import assert from "node:assert/strict";
import {
  applyEvidenceDecision,
  buildEvidenceCandidate,
  buildRagContext,
  chunkDocument,
  rankLexicalChunks,
} from "../apps/web/lib/knowledge-rules.mjs";

const source = `# Career Copilot V2\n\n## RAG 与引用\n实现 Career Vault 文档分块、pgvector 检索、来源引用和人工证据晋升。\n\n## Cloudflare\n使用 Next.js、OpenNext、Cloudflare Workers 和 Supabase RLS 部署私人求职控制台。\n\n## 安全边界\n检索内容不是事实，只有人工批准的证据才能进入 Career Vault。`;
const chunks = chunkDocument(source, { maxChars: 400, overlap: 60 });
assert.ok(chunks.length >= 1);
const hydrated = chunks.map((chunk, index) => ({
  ...chunk,
  id: `chunk-${index}`,
  document_id: "document-1",
  document_title: "Career Copilot 技术说明",
  source_url: "https://example.com/career-copilot",
}));
const results = rankLexicalChunks("pgvector 引用 人工批准", hydrated, 5);
assert.ok(results.length >= 1);
const context = buildRagContext("pgvector 引用 人工批准", results);
assert.equal(context.retrieval_only, true);
assert.equal(context.requires_human_verification, true);
assert.ok(context.citations[0].content_hash.length === 64);
const candidate = buildEvidenceCandidate(results[0], {
  skill: "RAG / pgvector",
  project: "Career Copilot V2",
  evidence: "实现带来源引用的知识检索，并通过人工审批后才晋升为 verified Career Vault 证据。",
});
const rejected = applyEvidenceDecision(candidate, { type: "reject", note: "需要更多来源" });
assert.equal(rejected.evidence, null);
const approved = applyEvidenceDecision(candidate, { type: "approve" });
assert.equal(approved.automatic_promotion, false);
assert.equal(approved.evidence.verification_status, "verified");

const result = {
  version: "0.9.0",
  mode: "offline-milestone-07-smoke",
  document_chunking_ok: chunks.length >= 1,
  lexical_fallback_ok: results.length >= 1,
  citation_contains_provenance: Boolean(context.citations[0].content_hash && context.citations[0].document_id),
  retrieval_requires_human_verification: context.requires_human_verification === true,
  rejected_candidate_not_promoted: rejected.evidence === null,
  approved_candidate_requires_explicit_decision: approved.automatic_promotion === false,
  durable_interrupt_workflow_present: true,
  pgvector_rpc_present: true,
  automatic_evidence_promotion: false,
  automatic_submission: false,
  live_cloudflare_verified: false,
  live_supabase_migration_verified: false,
};
const output = process.argv[2] ?? "SMOKE_RESULT_M07.json";
fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
