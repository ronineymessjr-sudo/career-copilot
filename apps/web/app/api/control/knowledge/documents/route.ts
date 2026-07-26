import { NextRequest, NextResponse } from "next/server";
import { chunkDocument, normalizeDocumentText, sha256Hex } from "@/lib/knowledge-rules.mjs";
import { embedTexts } from "@/lib/embedding-service";
import { ensureProfile } from "@/lib/profile-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

const SOURCE_TYPES = new Set(["text", "markdown", "json", "csv", "resume", "project", "note", "other"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const profile = await ensureProfile(auth);
    const documents = await dataRequest<Array<Record<string, any>>>(
      auth,
      `career_documents?select=*&profile_id=eq.${encodeURIComponent(String(profile.id))}&order=updated_at.desc`,
    );
    return NextResponse.json({ ok: true, profile, documents });
  } catch (error) { return controlError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const title = String(body.title ?? "").trim().slice(0, 240);
    const content = normalizeDocumentText(body.content);
    if (!title || !content) return NextResponse.json({ ok: false, error: "title 和 content 均为必填" }, { status: 422 });
    if (content.length > 120_000) return NextResponse.json({ ok: false, error: "单个文档最多 120,000 个字符" }, { status: 413 });
    const profile = await ensureProfile(auth);
    const contentHash = sha256Hex(content);
    const existing = await dataRequest<Array<Record<string, any>>>(
      auth,
      `career_documents?select=*&user_id=eq.${encodeURIComponent(auth.userId)}&content_hash=eq.${contentHash}&limit=1`,
    );
    if (existing[0]) {
      return NextResponse.json({ ok: true, document: existing[0], deduplicated: true, message: "相同内容已存在" });
    }
    const sourceType = SOURCE_TYPES.has(body.source_type) ? body.source_type : "text";
    const chunks = chunkDocument(content, { maxChars: 1200, overlap: 160, maxChunks: 80 });
    if (!chunks.length) return NextResponse.json({ ok: false, error: "文档未产生有效分块" }, { status: 422 });
    const created = await dataRequest<Array<Record<string, any>>>(auth, "career_documents", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        user_id: auth.userId,
        profile_id: profile.id,
        title,
        source_type: sourceType,
        source_url: String(body.source_url ?? "").trim() || null,
        mime_type: String(body.mime_type ?? "text/plain").trim().slice(0, 120) || "text/plain",
        content_hash: contentHash,
        status: "processing",
        embedding_provider: "none",
        embedding_model: "",
        chunk_count: 0,
        metadata: {
          original_filename: String(body.original_filename ?? "").slice(0, 240),
          character_count: content.length,
          ingestion_mode: "user_provided_text",
        },
      }]),
    });
    const document = created[0];
    let embeddings: Awaited<ReturnType<typeof embedTexts>> = [];
    let embeddingError = "";
    try {
      for (let start = 0; start < chunks.length; start += 16) {
        embeddings.push(...await embedTexts(chunks.slice(start, start + 16).map((chunk) => chunk.content)));
      }
    } catch (error) {
      embeddingError = error instanceof Error ? error.message : "embedding_failed";
      embeddings = chunks.map(() => ({ embedding: null, provider: "none" as const, model: "", mode: "lexical" as const }));
    }
    const rows = chunks.map((chunk, index) => ({
      user_id: auth.userId,
      profile_id: profile.id,
      document_id: document.id,
      ...chunk,
      provenance: {
        document_title: title,
        source_type: sourceType,
        source_url: String(body.source_url ?? "").trim() || null,
        char_start: chunk.char_start,
        char_end: chunk.char_end,
        content_hash: chunk.content_hash,
      },
      embedding: embeddings[index]?.embedding ?? null,
      embedding_status: embeddings[index]?.embedding ? "ready" : "lexical_only",
      embedding_provider: embeddings[index]?.provider ?? "none",
      embedding_model: embeddings[index]?.model ?? "",
    }));
    await dataRequest(auth, "career_chunks", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(rows),
    });
    const firstEmbedding = embeddings.find((item) => item.embedding);
    const updated = await dataRequest<Array<Record<string, any>>>(auth, `career_documents?id=eq.${encodeURIComponent(String(document.id))}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: embeddingError ? "needs_review" : "active",
        embedding_provider: firstEmbedding?.provider ?? "none",
        embedding_model: firstEmbedding?.model ?? "",
        chunk_count: chunks.length,
        metadata: {
          ...document.metadata,
          character_count: content.length,
          embedding_error: embeddingError || null,
          lexical_fallback: !firstEmbedding,
        },
        updated_at: new Date().toISOString(),
      }),
    });
    await dataRequest(auth, "operational_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: auth.userId,
        event_name: "knowledge_document_ingested",
        status: embeddingError ? "warning" : "success",
        route: "/api/control/knowledge/documents",
        metadata: { document_id: document.id, chunk_count: chunks.length, embedding_provider: firstEmbedding?.provider ?? "none" },
      }]),
    });
    return NextResponse.json({ ok: true, document: updated[0], chunks: chunks.length, embedding_mode: firstEmbedding ? "vector" : "lexical", warning: embeddingError || null }, { status: 201 });
  } catch (error) { return controlError(error); }
}
