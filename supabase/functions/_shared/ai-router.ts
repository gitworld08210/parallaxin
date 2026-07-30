// Central AI model router — every AI call in the app goes through here.
//
// Two tiers:
//   reasoning → openai/gpt-5.6-sol   (hard reasoning, planning, finance/risk, agents)
//   fast      → google/gemini-3.6-flash (high volume, multimodal image/video/audio)
//
// Task → tier/model mapping is stored in public.ai_task_routes so it can be
// changed without redeploying functions. Falls back to the static table below.

export const MODELS = {
  reasoning: "openai/gpt-5.6-sol",
  reasoningFast: "openai/gpt-5.6-terra",
  cheap: "openai/gpt-5.6-luna",
  fast: "google/gemini-3.6-flash",
  multimodal: "google/gemini-3.6-flash",
  pro: "google/gemini-3.1-pro-preview",
} as const;

export type AiTier = keyof typeof MODELS;

/** Static defaults, used when the DB route table has no row for the task. */
export const DEFAULT_ROUTES: Record<string, { tier: AiTier; fallback?: AiTier }> = {
  // ---- reasoning tier (OpenAI GPT-5.6 Sol) ----
  general_reasoning: { tier: "reasoning", fallback: "pro" },
  executive_ai: { tier: "reasoning", fallback: "pro" },
  kip_chat: { tier: "reasoning", fallback: "fast" },
  ads_recommendations: { tier: "reasoning", fallback: "pro" },
  ads_budget_advice: { tier: "reasoning", fallback: "pro" },
  credit_risk: { tier: "reasoning", fallback: "pro" },
  moderation_adjudication: { tier: "reasoning", fallback: "fast" },
  authenticity_score: { tier: "reasoning", fallback: "fast" },
  forecasting: { tier: "reasoning", fallback: "pro" },
  fraud_detection: { tier: "reasoning", fallback: "pro" },

  // ---- fast tier (Gemini 3.6 Flash) ----
  fast_daily: { tier: "fast", fallback: "cheap" },
  ai_assistant: { tier: "fast", fallback: "reasoningFast" },
  ad_copy: { tier: "fast", fallback: "reasoningFast" },
  caption: { tier: "fast", fallback: "cheap" },
  bio_rewrite: { tier: "fast", fallback: "cheap" },
  alt_text: { tier: "fast", fallback: "cheap" },
  dm_suggest: { tier: "fast", fallback: "cheap" },
  post_suggestions: { tier: "fast", fallback: "cheap" },
  creator_coach: { tier: "fast", fallback: "reasoningFast" },
  moderation: { tier: "fast", fallback: "cheap" },
  image_analysis: { tier: "multimodal", fallback: "reasoning" },
  video_analysis: { tier: "multimodal", fallback: "pro" },
  creative_critique: { tier: "multimodal", fallback: "reasoning" },
  translation: { tier: "fast", fallback: "cheap" },
  ranking: { tier: "fast", fallback: "cheap" },
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export class AiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AiError";
  }
}

const isGpt56 = (m: string) => m.startsWith("openai/gpt-5.6");
const supportsPriority = (m: string) => m.startsWith("openai/gpt-5.6") || m.startsWith("openai/gpt-5.4") || m === "openai/gpt-5.5" || m === "openai/gpt-5" || m === "openai/gpt-5-mini";

// --- route resolution (cached in-memory per isolate for 60s) ---
let routeCache: { at: number; rows: Record<string, { primary?: string; fallback?: string }> } = { at: 0, rows: {} };

async function loadDbRoutes(): Promise<Record<string, { primary?: string; fallback?: string }>> {
  if (Date.now() - routeCache.at < 60_000) return routeCache.rows;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return {};
  try {
    const res = await fetch(`${url}/rest/v1/ai_task_routes?select=task_key,primary_model,fallback_model`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return routeCache.rows;
    const rows = (await res.json()) as Array<{ task_key: string; primary_model: string; fallback_model: string | null }>;
    const map: Record<string, { primary?: string; fallback?: string }> = {};
    for (const r of rows) {
      if (!r.primary_model || r.primary_model.startsWith("internal/")) continue;
      map[r.task_key] = { primary: r.primary_model, fallback: r.fallback_model ?? undefined };
    }
    routeCache = { at: Date.now(), rows: map };
    return map;
  } catch {
    return routeCache.rows;
  }
}

export async function resolveModels(task: string): Promise<{ primary: string; fallback?: string }> {
  const db = await loadDbRoutes();
  const hit = db[task];
  if (hit?.primary) return { primary: hit.primary, fallback: hit.fallback };
  const def = DEFAULT_ROUTES[task] ?? DEFAULT_ROUTES.fast_daily;
  return { primary: MODELS[def.tier], fallback: def.fallback ? MODELS[def.fallback] : undefined };
}

export type AiPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type AiMessage = { role: "system" | "user" | "assistant"; content: string | AiPart[] };

export interface AiCallOptions {
  /** Task key — drives which model is used (see DEFAULT_ROUTES). */
  task: string;
  messages: AiMessage[];
  system?: string;
  json?: boolean;
  /** JSON schema for strict structured output (OpenAI models). */
  schema?: { name: string; schema: Record<string, unknown> };
  temperature?: number;
  maxTokens?: number;
  /** Force a specific gateway model, bypassing the route table. */
  model?: string;
  /** Ask for OpenAI priority serving on capable models. */
  fast?: boolean;
  stream?: boolean;
  signal?: AbortSignal;
}

function buildBody(model: string, o: AiCallOptions) {
  const messages: AiMessage[] = o.system ? [{ role: "system", content: o.system }, ...o.messages] : o.messages;
  const body: Record<string, unknown> = { model, messages };

  // GPT-5.6 rejects chat-completions with tools unless reasoning_effort is "none".
  if (isGpt56(model)) body.reasoning_effort = "none";
  else if (o.temperature !== undefined) body.temperature = o.temperature;

  if (!isGpt56(model) && o.temperature === undefined) body.temperature = 0.7;
  if (o.maxTokens) body.max_tokens = o.maxTokens;
  if (o.fast && supportsPriority(model)) body.service_tier = "priority";
  if (o.stream) body.stream = true;

  if (o.schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: o.schema.name, schema: o.schema.schema, strict: true },
    };
  } else if (o.json) {
    body.response_format = { type: "json_object" };
  }
  return body;
}

async function mapError(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  if (res.status === 429) throw new AiError(429, "AI rate limit reached — please try again in a moment.");
  if (res.status === 402) throw new AiError(402, "AI credits exhausted. Add credits in workspace settings to continue.");
  throw new AiError(res.status, text.slice(0, 600) || `AI gateway error ${res.status}`);
}

async function post(model: string, o: AiCallOptions): Promise<Response> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new AiError(500, "LOVABLE_API_KEY not configured");
  return await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(buildBody(model, o)),
    signal: o.signal,
  });
}

/** One-shot call. Returns assistant text. Falls back to the secondary model on 5xx. */
export async function aiText(o: AiCallOptions): Promise<{ text: string; model: string }> {
  const { primary, fallback } = o.model ? { primary: o.model, fallback: undefined } : await resolveModels(o.task);
  let res = await post(primary, o);
  let used = primary;
  if (!res.ok && fallback && (res.status >= 500 || res.status === 404 || res.status === 400)) {
    res = await post(fallback, o);
    used = fallback;
  }
  if (!res.ok) await mapError(res);
  const data = await res.json();
  return { text: (data?.choices?.[0]?.message?.content ?? "").toString().trim(), model: used };
}

/** One-shot JSON call. Parses the response, tolerating code fences. */
export async function aiJson<T = unknown>(o: AiCallOptions): Promise<T> {
  const { text } = await aiText({ ...o, json: o.schema ? undefined : true });
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const m = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (m) return JSON.parse(m[0]) as T;
    throw new AiError(502, "AI returned malformed JSON");
  }
}

/** Streaming call — returns the upstream OpenAI-compatible SSE response. */
export async function aiStream(o: AiCallOptions): Promise<Response> {
  const { primary, fallback } = o.model ? { primary: o.model, fallback: undefined } : await resolveModels(o.task);
  let res = await post(primary, { ...o, stream: true });
  if (!res.ok && fallback && res.status >= 500) res = await post(fallback, { ...o, stream: true });
  if (!res.ok) await mapError(res);
  return res;
}

/** Standard error → HTTP response mapping for edge functions. */
export function aiErrorResponse(err: unknown, corsHeaders: Record<string, string>): Response {
  const status = err instanceof AiError ? err.status : 500;
  const message = err instanceof Error ? err.message : "AI request failed";
  return new Response(JSON.stringify({ error: message, status }), {
    status: status === 402 || status === 429 ? status : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
