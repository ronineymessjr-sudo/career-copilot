import { ControlApiError } from "@/lib/supabase-control";

export type EmbeddingResult = {
  embedding: number[] | null;
  provider: "openai" | "none";
  model: string;
  mode: "vector" | "lexical";
};

const DIMENSIONS = 1536;

function embeddingConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const configured = process.env.OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
  const model = /^text-embedding-[A-Za-z0-9._-]+$/.test(configured) ? configured : "text-embedding-3-small";
  return { apiKey, model };
}

export async function embedTexts(inputs: string[]): Promise<EmbeddingResult[]> {
  const cleaned = inputs.map((input) => String(input ?? "").trim().slice(0, 24000));
  const { apiKey, model } = embeddingConfig();
  if (!apiKey) return cleaned.map(() => ({ embedding: null, provider: "none", model: "", mode: "lexical" }));
  if (cleaned.some((text) => !text)) throw new ControlApiError(422, "Embedding 输入不能为空");
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: cleaned,
      dimensions: DIMENSIONS,
      encoding_format: "float",
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ControlApiError(502, "Embedding 服务请求失败", {
      status: response.status,
      type: payload?.error?.type ?? null,
      code: payload?.error?.code ?? null,
    });
  }
  const rows = Array.isArray(payload?.data) ? [...payload.data].sort((a, b) => Number(a.index) - Number(b.index)) : [];
  if (rows.length !== cleaned.length) throw new ControlApiError(502, "Embedding 服务返回数量不匹配");
  return rows.map((row) => {
    const embedding = row?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== DIMENSIONS || embedding.some((value: unknown) => typeof value !== "number" || !Number.isFinite(value))) {
      throw new ControlApiError(502, "Embedding 服务返回了无效向量");
    }
    return { embedding, provider: "openai" as const, model, mode: "vector" as const };
  });
}

export async function embedText(input: string): Promise<EmbeddingResult> {
  return (await embedTexts([input]))[0];
}
