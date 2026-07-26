import test from "node:test";
import assert from "node:assert/strict";
import {
  applyEvidenceDecision,
  buildEvidenceCandidate,
  buildRagContext,
  chunkDocument,
  lexicalScore,
  rankLexicalChunks,
  sha256Hex,
} from "../lib/knowledge-rules.mjs";

test("document chunking preserves overlap and provenance ranges", () => {
  const text = "# Career Copilot\n" + "FastAPI 与 Next.js 项目证据。".repeat(120);
  const chunks = chunkDocument(text, { maxChars: 500, overlap: 80 });
  assert.ok(chunks.length > 2);
  assert.equal(chunks[0].chunk_index, 0);
  assert.ok(chunks[0].content_hash.length === 64);
  assert.ok(chunks[1].char_start < chunks[0].char_end);
  assert.ok(chunks.every((chunk) => chunk.char_end >= chunk.char_start));
});

test("same content produces stable hash", () => {
  assert.equal(sha256Hex("abc"), sha256Hex("abc"));
  assert.notEqual(sha256Hex("abc"), sha256Hex("abd"));
});

test("lexical retrieval ranks matching verified project content", () => {
  const chunks = [
    { id: "1", document_id: "d1", document_title: "项目", chunk_index: 0, heading: "FastAPI", content: "使用 FastAPI PostgreSQL Docker 构建后端服务" },
    { id: "2", document_id: "d1", document_title: "项目", chunk_index: 1, heading: "摄影", content: "摄影构图与灯光" },
  ];
  assert.ok(lexicalScore("FastAPI Docker", chunks[0].content, chunks[0].heading) > 0.5);
  const ranked = rankLexicalChunks("FastAPI Docker", chunks);
  assert.equal(ranked[0].id, "1");
});

test("retrieval context always requires human verification", () => {
  const context = buildRagContext("RAG", [{ id: "c", document_id: "d", document_title: "简历", chunk_index: 2, content: "RAG 项目", provenance: {} }]);
  assert.equal(context.retrieval_only, true);
  assert.equal(context.requires_human_verification, true);
  assert.equal(context.citations.length, 1);
});

test("candidate promotion is never automatic", () => {
  const candidate = buildEvidenceCandidate({
    id: "c1",
    document_id: "d1",
    document_title: "Career Copilot",
    chunk_index: 0,
    heading: "RAG",
    content: "实现带引用的 Career Vault 检索。",
    source_url: "https://example.com",
  });
  const approved = applyEvidenceDecision(candidate, { type: "approve" });
  assert.equal(approved.status, "completed");
  assert.equal(approved.automatic_promotion, false);
  assert.equal(approved.evidence.verification_status, "verified");
  const rejected = applyEvidenceDecision(candidate, { type: "reject", note: "证据不足" });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.evidence, null);
});

test("edited approval validates required evidence fields", () => {
  const candidate = buildEvidenceCandidate({
    id: "c1", document_id: "d1", document_title: "项目", chunk_index: 0, content: "原始证据",
  }, { skill: "Python", project: "项目" });
  const result = applyEvidenceDecision(candidate, { type: "edit", edited: { evidence: "修改后的真实证据" } });
  assert.equal(result.evidence.evidence, "修改后的真实证据");
  assert.throws(() => applyEvidenceDecision(candidate, { type: "edit", edited: { evidence: "" } }));
});
