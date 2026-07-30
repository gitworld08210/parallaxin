// Back-compat shim. All AI traffic now flows through `_shared/ai-router.ts`
// (OpenAI GPT-5.6 Sol for reasoning, Gemini 3.6 Flash for fast/multimodal).
// Existing callers keep the old Gemini-shaped API; the router picks the model.

import { aiText, aiStream, AiError, MODELS, type AiMessage, type AiPart } from "./ai-router.ts";

export type GeminiModel = string;

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type GeminiMessage = { role: "user" | "model"; parts: GeminiPart[] };

interface GenerateOpts {
  model?: GeminiModel;
  /** Preferred: route key from ai-router DEFAULT_ROUTES. */
  task?: string;
  system?: string;
  messages: GeminiMessage[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

const wrap = (e: unknown): never => {
  if (e instanceof AiError) throw new GeminiError(e.status, e.message);
  throw e;
};

/** Legacy model string → new gateway model. */
function mapLegacyModel(m?: string): string | undefined {
  if (!m) return undefined;
  const v = m.replace(/^google\//, "");
  if (v.includes("pro")) return MODELS.reasoning;          // heavy work → GPT-5.6 Sol
  if (v.includes("lite")) return MODELS.cheap;             // trivial work → GPT-5.6 Luna
  if (v.includes("flash")) return MODELS.fast;             // default → Gemini 3.6 Flash
  return m.includes("/") ? m : MODELS.fast;
}

function toAiMessages(messages: GeminiMessage[]): AiMessage[] {
  return messages.map((m) => {
    const role = m.role === "model" ? "assistant" : "user";
    const texts = m.parts.filter((p): p is { text: string } => "text" in p).map((p) => p.text);
    const images = m.parts.filter(
      (p): p is { inlineData: { mimeType: string; data: string } } => "inlineData" in p,
    );
    if (images.length === 0) return { role, content: texts.join("\n") } as AiMessage;
    const content: AiPart[] = [];
    if (texts.length) content.push({ type: "text", text: texts.join("\n") });
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}` },
      });
    }
    return { role, content } as AiMessage;
  });
}

/** One-shot AI call. Returns the assistant text. */
export async function generateGemini(opts: GenerateOpts): Promise<string> {
  try {
    const hasImage = opts.messages.some((m) => m.parts.some((p) => "inlineData" in p));
    const { text } = await aiText({
      task: opts.task ?? (hasImage ? "image_analysis" : "fast_daily"),
      model: mapLegacyModel(opts.model),
      system: opts.system,
      messages: toAiMessages(opts.messages),
      json: opts.json,
      temperature: opts.temperature,
      maxTokens: opts.maxTokens ?? 2048,
    });
    return text;
  } catch (e) {
    return wrap(e);
  }
}

/** Streaming AI call. Returns the upstream OpenAI-compatible SSE response. */
export async function streamGemini(opts: GenerateOpts): Promise<Response> {
  try {
    return await aiStream({
      task: opts.task ?? "fast_daily",
      model: mapLegacyModel(opts.model),
      system: opts.system,
      messages: toAiMessages(opts.messages),
      temperature: opts.temperature,
      maxTokens: opts.maxTokens ?? 4096,
    });
  } catch (e) {
    return wrap(e);
  }
}

/** Lovable Gateway already streams OpenAI-compatible SSE — passthrough. */
export function geminiToOpenAiSSE(upstream: Response): ReadableStream<Uint8Array> {
  return upstream.body!;
}
