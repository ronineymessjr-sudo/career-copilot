import { NextRequest, NextResponse } from "next/server";
import { buildRagContext, rankLexicalChunks } from "@/lib/knowledge-rules.mjs";
import { embedText } from "@/lib/embedding-service";
import { authenticate, controlError, dataRequest } from "@/lib/supabase-control";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const query = String(body.query ?? "").trim().slice(0, 4000);
    const limit = Math.max(1, Math.min(Number(body.limit ?? 8), 20));
    if (!query) return NextResponse.json({ ok: false, error: "query 为必填" }, { status: 422 });
    const embedded = await embedText(query);
    let results: Array<Record<string, any>> = [];
    let retrievalMode = "lexical";
    if (embedded.embedding) {
      try {
        results = await dataRequest<Array<Record<string, any>>>(auth, "rpc/match_career_chunks", {
          method: "POST",
          body: JSON.stringify({ query_embedding: embedded.embedding, match_threshold: Number(body.threshold ?? 0.2), match_count: limit }),
        });
        results = results.map((item) => ({ ...item, retrieval_mode: "vector" }));
        retrievalMode = "vector";
      } catch {
        results = [];
      }
    }
    if (!results.length) {
      const [chunks, documents] = await Promise.all([
        dataRequest<Array<Record<string, any>>>(auth, "career_chunks?select=*&order=updated_at.desc&limit=500"),
        dataRequest<Array<Record<string, any>>>(auth, "career_documents?select=id,title,source_url,status"),
      ]);
      const documentById = new Map(documents.filter((doc) => doc.status === "active" || doc.status === "needs_review").map((doc) => [String(doc.id), doc]));
      const candidates = chunks.flatMap((chunk) => {
        const document = documentById.get(String(chunk.document_id));
        return document ? [{ ...chunk, document_title: document.title, source_url: document.source_url }] : [];
      });
      results = rankLexicalChunks(query, candidates, limit);
      retrievalMode = "lexical";
    }
    return NextResponse.json({
      ok: true,
      query,
      retrieval_mode: retrievalMode,
      embedding_model: embedded.model || null,
      results,
      context: buildRagContext(query, results),
    });
  } catch (error) { return controlError(error); }
}
