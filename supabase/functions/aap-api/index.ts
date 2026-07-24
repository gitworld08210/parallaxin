// Aurelix Ads Platform — public REST API gateway.
// Authenticates via `Authorization: Bearer <api key>`, verifies via SECURITY DEFINER
// RPC, then proxies a small set of resources scoped to the caller's advertiser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json(401, { error: "missing_bearer_token" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: auths, error: authErr } = await supabase.rpc("aap_verify_api_key", { p_raw: token });
  if (authErr || !auths || (auths as any[]).length === 0) return json(401, { error: "invalid_api_key" });
  const { advertiser_id, scopes } = (auths as any[])[0];

  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  // Path: /aap-api/v1/<resource>[/<id>]
  const resource = parts[2] ?? "";
  const id = parts[3];
  const method = req.method.toUpperCase();

  const canWrite = (scopes as string[]).some((s) => s === "write" || s === "admin");
  const requireWrite = () => (canWrite ? null : json(403, { error: "scope_write_required" }));

  try {
    if (resource === "campaigns") {
      if (method === "GET" && !id) {
        const { data, error } = await supabase
          .from("aap_campaigns").select("*")
          .eq("advertiser_id", advertiser_id)
          .order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return json(200, { data });
      }
      if (method === "GET" && id) {
        const { data, error } = await supabase
          .from("aap_campaigns").select("*")
          .eq("advertiser_id", advertiser_id).eq("id", id).maybeSingle();
        if (error) throw error;
        return data ? json(200, { data }) : json(404, { error: "not_found" });
      }
      if (method === "POST") {
        const blocked = requireWrite(); if (blocked) return blocked;
        const body = await req.json();
        const { data, error } = await supabase.from("aap_campaigns")
          .insert({ ...body, advertiser_id }).select("*").single();
        if (error) throw error;
        return json(201, { data });
      }
      if (method === "PATCH" && id) {
        const blocked = requireWrite(); if (blocked) return blocked;
        const body = await req.json();
        delete body.advertiser_id; delete body.id;
        const { data, error } = await supabase.from("aap_campaigns")
          .update(body).eq("advertiser_id", advertiser_id).eq("id", id)
          .select("*").maybeSingle();
        if (error) throw error;
        return data ? json(200, { data }) : json(404, { error: "not_found" });
      }
    }

    if (resource === "ads" && method === "GET") {
      const { data, error } = await supabase.from("aap_ads")
        .select("*").eq("advertiser_id", advertiser_id).limit(200);
      if (error) throw error;
      return json(200, { data });
    }

    if (resource === "reports" && method === "GET") {
      const days = Number(url.searchParams.get("days") ?? 30);
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase.from("aap_daily_rollups")
        .select("day, campaign_id, ad_id, surface, impressions, clicks, conversions, spend")
        .eq("advertiser_id", advertiser_id).gte("day", since)
        .order("day", { ascending: false });
      if (error) throw error;
      return json(200, { data });
    }

    if (resource === "attributions" && method === "GET") {
      const days = Number(url.searchParams.get("days") ?? 30);
      const { data, error } = await supabase.rpc("aap_attribution_summary" as any, {
        p_advertiser_id: advertiser_id, p_days: days,
      });
      if (error) throw error;
      return json(200, { data });
    }

    if (resource === "me" && method === "GET") {
      return json(200, { advertiser_id, scopes });
    }

    return json(404, { error: "unknown_route", hint: "try /aap-api/v1/{campaigns|ads|reports|attributions|me}" });
  } catch (e: any) {
    return json(500, { error: e.message ?? "internal_error" });
  }
});
