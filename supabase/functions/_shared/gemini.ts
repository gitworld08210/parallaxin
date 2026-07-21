// Shared AI helper — routed through Lovable AI Gateway (OpenAI-compatible).
// Uses LOVABLE_API_KEY. Model names use the Gateway's `google/gemini-*` prefixes.

export type GeminiModel =
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-flash-lite"
  | "google/gemini-2.5-pro"
  | "google/gemini-2.0-flash"
  // Back-compat: bare names auto-mapped to google/*
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite"
  | "gemini-2.5-pro"
  | "gemini-2.0-flash";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type GeminiMessage = { role: "user" | "model"; parts: GeminiPart[] };

interface GenerateOpts {
  model?: GeminiModel;
  system?: string;
  messages: GeminiMessage[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const normalizeModel = (m?: GeminiModel): string => {
  const v = m ?? "google/gemini-2.5-flash";
  return v.startsWith("google/") ? v : `google/${v}`;
};

// Convert Gemini-style messages → OpenAI chat messages
const toOpenAiMessages = (system: string | undefined, messages: GeminiMessage[]) => {
  const out: Array<{ role: "system" | "user" | "assistant"; content: any }> = [];
  if (system) out.push({ role: "system", content: system });
  for (const m of messages) {
    const role = m.role === "model" ? "assistant" : "user";
    // Flatten parts: text joined, inlineData → OpenAI image_url data URI
    const textParts = m.parts.filter((p): p is { text: string } => "text" in p).map((p) => p.text);
    const images = m.parts.filter((p): p is { inlineData: { mimeType: string; data: string } } => "inlineData" in p);
    if (images.length === 0) {
      out.push({ role, content: textParts.join("\n") });
    } else {
      const content: any[] = [];
      if (textParts.length) content.push({ type: "text", text: textParts.join("\n") });
      for (const img of images) {
        content.push({
          type: "image_url",
          image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` },
        });
      }
      out.push({ role, content });
    }
  }
  return out;
};

const mapError = async (res: Response): Promise<never> => {
  const text = await res.text().catch(() => "");
  if (res.status === 429) throw new GeminiError(429, "Rate limit — try again shortly.");
  if (res.status === 402) throw new GeminiError(402, "AI credits exhausted. Add credits in workspace settings.");
  throw new GeminiError(res.status, text.slice(0, 500) || `AI gateway error ${res.status}`);
};

/** One-shot AI call. Returns the assistant text. */
export async function generateGemini(opts: GenerateOpts): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new GeminiError(500, "LOVABLE_API_KEY not configured");

  const body: any = {
    model: normalizeModel(opts.model),
    messages: toOpenAiMessages(opts.system, opts.messages),
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 2048,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) await mapError(res);
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content ?? "").toString().trim();
}

/** Streaming AI call. Returns upstream Response (OpenAI SSE). */
export async function streamGemini(opts: GenerateOpts): Promise<Response> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new GeminiError(500, "LOVABLE_API_KEY not configured");

  const body = {
    model: normalizeModel(opts.model),
    messages: toOpenAiMessages(opts.system, opts.messages),
    temperature: opts.temperature ?? 0.8,
    max_tokens: opts.maxTokens ?? 4096,
    stream: true,
  };

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) await mapError(res);
  return res;
}

/** Lovable Gateway already streams OpenAI-compatible SSE — passthrough. */
export function geminiToOpenAiSSE(upstream: Response): ReadableStream<Uint8Array> {
  return upstream.body!;
}
