import { createHash } from "node:crypto";

const SPACE_RE = /[\t\u00a0]+/g;
const WORD_RE = /[\p{L}\p{N}_+#.-]+/gu;

export function sha256Hex(value) {
  return createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
}

export function normalizeDocumentText(value) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(SPACE_RE, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function headingFor(text, offset) {
  const before = text.slice(0, offset).split("\n");
  for (let index = before.length - 1; index >= 0; index -= 1) {
    const line = before[index].trim();
    if (/^#{1,6}\s+/.test(line)) return line.replace(/^#{1,6}\s+/, "").trim();
    if (line.length > 0 && line.length <= 80 && /[:：]$/.test(line)) return line.replace(/[:：]$/, "").trim();
  }
  return "";
}

export function chunkDocument(input, options = {}) {
  const text = normalizeDocumentText(input);
  const maxChars = Math.max(400, Math.min(Number(options.maxChars ?? 1200), 2400));
  const overlap = Math.max(0, Math.min(Number(options.overlap ?? 160), Math.floor(maxChars / 3)));
  const maxChunks = Math.max(1, Math.min(Number(options.maxChunks ?? 80), 160));
  if (!text) return [];
  const chunks = [];
  let start = 0;
  while (start < text.length && chunks.length < maxChunks) {
    let end = Math.min(text.length, start + maxChars);
    if (end < text.length) {
      const searchStart = Math.max(start + Math.floor(maxChars * 0.55), start);
      const window = text.slice(searchStart, end);
      const paragraph = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf("\n"));
      const sentence = Math.max(window.lastIndexOf("。"), window.lastIndexOf("！"), window.lastIndexOf("？"), window.lastIndexOf(". "));
      const splitAt = Math.max(paragraph >= 0 ? searchStart + paragraph + 1 : -1, sentence >= 0 ? searchStart + sentence + 1 : -1);
      if (splitAt > start) end = splitAt;
    }
    const content = text.slice(start, end).trim();
    if (content) {
      chunks.push({
        chunk_index: chunks.length,
        heading: headingFor(text, start),
        content,
        content_hash: sha256Hex(content),
        char_start: start,
        char_end: end,
        token_estimate: Math.max(1, Math.ceil(content.length / 3.5)),
      });
    }
    if (end >= text.length) break;
    const next = Math.max(end - overlap, start + 1);
    start = next;
  }
  return chunks;
}

export function tokenize(value) {
  const normalized = normalizeDocumentText(value).toLowerCase();
  const words = normalized.match(WORD_RE) ?? [];
  const han = Array.from(normalized.matchAll(/[\p{Script=Han}]/gu), (match) => match[0]);
  const bigrams = [];
  for (let i = 0; i < han.length - 1; i += 1) bigrams.push(`${han[i]}${han[i + 1]}`);
  return [...new Set([...words, ...bigrams].filter((token) => token.length > 1))];
}

export function lexicalScore(query, content, heading = "") {
  const terms = tokenize(query);
  if (!terms.length) return 0;
  const body = `${heading}\n${content}`.toLowerCase();
  let matches = 0;
  let headingMatches = 0;
  for (const term of terms) {
    if (body.includes(term)) matches += 1;
    if (String(heading).toLowerCase().includes(term)) headingMatches += 1;
  }
  const coverage = matches / terms.length;
  const density = Math.min(1, matches / Math.max(3, Math.sqrt(Math.max(1, content.length / 80))));
  return Number(Math.min(1, coverage * 0.72 + density * 0.18 + headingMatches * 0.05).toFixed(6));
}

export function rankLexicalChunks(query, chunks, limit = 8) {
  return chunks
    .map((chunk) => ({ ...chunk, similarity: lexicalScore(query, chunk.content, chunk.heading), retrieval_mode: "lexical" }))
    .filter((chunk) => chunk.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity || Number(a.chunk_index ?? 0) - Number(b.chunk_index ?? 0))
    .slice(0, Math.max(1, Math.min(Number(limit) || 8, 20)));
}

export function citationForChunk(chunk) {
  return {
    citation_id: `doc:${chunk.document_id}:chunk:${chunk.chunk_index}`,
    document_id: chunk.document_id,
    chunk_id: chunk.id,
    chunk_index: Number(chunk.chunk_index ?? 0),
    title: chunk.document_title ?? chunk.title ?? "未命名文档",
    heading: chunk.heading ?? "",
    source_url: chunk.source_url ?? null,
    char_start: Number(chunk.char_start ?? chunk.provenance?.char_start ?? 0),
    char_end: Number(chunk.char_end ?? chunk.provenance?.char_end ?? 0),
    content_hash: chunk.content_hash ?? chunk.provenance?.content_hash ?? "",
  };
}

export function buildEvidenceCandidate(chunk, input = {}) {
  const skill = String(input.skill ?? chunk.heading ?? "项目能力").trim().slice(0, 120) || "项目能力";
  const project = String(input.project ?? chunk.document_title ?? "Career Vault 文档").trim().slice(0, 180) || "Career Vault 文档";
  const evidence = String(input.evidence ?? chunk.content ?? "").trim().slice(0, 1600);
  if (!evidence) throw new Error("候选证据内容不能为空");
  return {
    skill,
    project,
    evidence,
    confidence: Math.max(0, Math.min(Number(input.confidence ?? 85), 100)),
    verification_status: "verified",
    evidence_source: "document_chunk",
    source_ref: citationForChunk(chunk).citation_id,
    source_url: chunk.source_url ?? null,
    active: true,
    citation: citationForChunk(chunk),
  };
}

export function normalizeWorkflowDecision(input) {
  const type = ["approve", "edit", "reject"].includes(input?.type) ? input.type : "reject";
  const note = String(input?.note ?? "").trim().slice(0, 1000);
  const edited = input?.edited && typeof input.edited === "object" ? input.edited : {};
  return { type, note, edited };
}

export function applyEvidenceDecision(candidate, input) {
  const decision = normalizeWorkflowDecision(input);
  if (decision.type === "reject") {
    return { status: "rejected", decision, evidence: null, automatic_promotion: false };
  }
  const source = decision.type === "edit" ? { ...candidate, ...decision.edited } : { ...candidate };
  const evidence = {
    ...source,
    skill: String(source.skill ?? "").trim().slice(0, 120),
    project: String(source.project ?? "").trim().slice(0, 180),
    evidence: String(source.evidence ?? "").trim().slice(0, 1600),
    confidence: Math.max(0, Math.min(Number(source.confidence ?? 85), 100)),
    verification_status: "verified",
    evidence_source: "document_chunk",
    active: true,
  };
  if (!evidence.skill || !evidence.project || !evidence.evidence) throw new Error("批准后的证据字段不完整");
  return { status: "completed", decision, evidence, automatic_promotion: false };
}

export function buildRagContext(query, results) {
  return {
    query: String(query ?? "").trim(),
    citations: results.map(citationForChunk),
    passages: results.map((item) => ({ citation_id: citationForChunk(item).citation_id, content: item.content })),
    retrieval_only: true,
    requires_human_verification: true,
  };
}
