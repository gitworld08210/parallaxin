// Shared Gemini API helper — direct Google Generative Language API.
// Uses the user's own GEMINI_API_KEY so quota + billing sits on their account.

export type GeminiModel =
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

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** One-shot Gemini call. Returns the assistant text. */
export async function generateGemini(opts: GenerateOpts): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new GeminiError(500, "GEMINI_API_KEY not configured");

  const model = opts.model ?? "gemini-2.5-flash";
  const body: any = {
    contents: opts.messages,
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      maxOutputTokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (opts.system) {
    body.systemInstruction = { role: "system", parts: [{ text: opts.system }] };
  }

  const res = await fetch(`${BASE}/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    // Gemini's 429 → rate limit, 400 with QUOTA → also treat as 429
    if (res.status === 429 || text.includes("RESOURCE_EXHAUSTED")) {
      throw new GeminiError(429, "Rate limit — try again shortly.");
    }
    if (res.status === 403) throw new GeminiError(402, "Gemini quota/billing issue.");
    throw new GeminiError(res.status, text.slice(0, 500));
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p.text ?? "").join("").trim();
}

/** Streaming Gemini call. Returns SSE-formatted Response body (OpenAI-like deltas). */
export async function streamGemini(opts: GenerateOpts): Promise<Response> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new GeminiError(500, "GEMINI_API_KEY not configured");

  const model = opts.model ?? "gemini-2.5-flash";
  const body: any = {
    contents: opts.messages,
    generationConfig: {
      temperature: opts.temperature ?? 0.8,
      maxOutputTokens: opts.maxTokens ?? 4096,
    },
  };
  if (opts.system) {
    body.systemInstruction = { role: "system", parts: [{ text: opts.system }] };
  }

  const res = await fetch(
    `${BASE}/${model}:streamGenerateContent?alt=sse&key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429 || text.includes("RESOURCE_EXHAUSTED")) {
      throw new GeminiError(429, "Rate limit — try again shortly.");
    }
    if (res.status === 403) throw new GeminiError(402, "Gemini quota/billing issue.");
    throw new GeminiError(res.status, text.slice(0, 500));
  }
  return res;
}

/** Convert Gemini SSE → OpenAI-compatible SSE (so existing clients keep working). */
export function geminiToOpenAiSSE(upstream: Response): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body!.getReader();

  return new ReadableStream({
    async start(controller) {
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;
            try {
              const json = JSON.parse(raw);
              const text = json?.candidates?.[0]?.content?.parts
                ?.map((p: any) => p.text ?? "").join("") ?? "";
              if (text) {
                const chunk = {
                  choices: [{ delta: { content: text }, index: 0 }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch { /* skip */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
