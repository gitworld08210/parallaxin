

import { supabase } from "@/integrations/supabase/client";

type InvokeOpts = {
  body?: unknown;
  /** Retries on failure (default 1 for enrichment, 0 for fire-and-forget). */
  retries?: number;
  /** Backoff between retries in ms. */
  backoffMs?: number;
  /** Label for logs. Defaults to function name. */
  label?: string;
  /** If true, rethrow after retries exhausted; otherwise swallow & log. */
  critical?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * reliableInvoke — replaces bare `.catch(() => {})` calls to edge functions.
 *
 * - Awaits the call (never fire-and-forget silently).
 * - Retries with backoff.
 * - Logs failures to console (Sentry hook point for Phase 6).
 * - `critical: true` → throws so caller can surface a toast/UI error.
 * - `critical: false` (default) → returns `{ data: null, error }` after logging.
 */
export async function reliableInvoke<T = unknown>(
  functionName: string,
  opts: InvokeOpts = {},
): Promise<{ data: T | null; error: Error | null }> {
  const { body, retries = 1, backoffMs = 400, label = functionName, critical = false } = opts;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body });
      if (error) throw error;
      return { data: data as T, error: null };
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await sleep(backoffMs * (attempt + 1));
        continue;
      }
    }
  }

  const err = lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  // Structured log — replace with Sentry.captureException in Phase 6.
  // eslint-disable-next-line no-console
  console.error(`[reliableInvoke] ${label} failed after ${retries + 1} attempt(s):`, err);

  if (critical) throw err;
  return { data: null, error: err };
}
