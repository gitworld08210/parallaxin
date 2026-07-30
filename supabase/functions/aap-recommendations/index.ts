// AI optimisation recommendations for the Ads Manager.
// Reasoning tier (OpenAI GPT-5.6 Sol) via the shared AI router.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { aiJson, aiErrorResponse } from "../_shared/ai-router.ts";

interface Body { advertiser_id?: string; from?: string; to?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const advertiserId = body.advertiser_id;
    if (!advertiserId) {
      return new Response(JSON.stringify({ error: "advertiser_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const to = body.to ?? new Date().toISOString().slice(0, 10);
    const from = body.from ?? new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

    // Membership check runs with the user's own token (RLS enforced).
    const { data: member } = await asUser
      .from("aap_advertiser_members").select("id").eq("advertiser_id", advertiserId).limit(1);
    if (!member || member.length === 0) {
      return new Response(JSON.stringify({ error: "No access to this ad account" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, service);

    const [{ data: campaigns }, { data: adGroups }, { data: rows }] = await Promise.all([
      admin.from("aap_campaigns").select("id,name,objective,status,daily_budget,total_budget,spent,bid_strategy")
        .eq("advertiser_id", advertiserId).limit(60),
      admin.from("aap_ad_groups").select("id,name,campaign_id,status,daily_budget,bid_strategy,bid_amount,optimization_goal,placements")
        .eq("advertiser_id", advertiserId).limit(120),
      admin.rpc("aap_report_rows", {
        _advertiser_id: advertiserId, _level: "campaign", _from: from, _to: to, _parent_id: null,
      }),
    ]);

    const perf = (rows ?? []).map((r: any) => {
      const imp = Number(r.impressions), clk = Number(r.clicks), conv = Number(r.conversions);
      const spend = Number(r.spend), rev = Number(r.revenue);
      return {
        campaign_id: r.entity_id,
        impressions: imp, clicks: clk, conversions: conv,
        spend: +spend.toFixed(2), revenue: +rev.toFixed(2),
        ctr: imp ? +((clk / imp) * 100).toFixed(2) : 0,
        cpc: clk ? +(spend / clk).toFixed(2) : 0,
        cpa: conv ? +(spend / conv).toFixed(2) : 0,
        roas: spend ? +(rev / spend).toFixed(2) : 0,
      };
    });

    const payload = {
      window: { from, to },
      currency: "INR",
      campaigns: (campaigns ?? []).map((c: any) => ({
        ...c, metrics: perf.find((p) => p.campaign_id === c.id) ?? null,
      })),
      ad_groups: adGroups ?? [],
    };

    const result = await aiJson<{ recommendations: any[] }>({
      task: "ads_recommendations",
      system:
        "You are a senior performance-marketing strategist reviewing an advertising account on the Aurelix Ads platform. " +
        "Analyse the supplied campaigns, ad sets and performance metrics and return concrete, specific optimisation actions. " +
        "Base every recommendation on a number that appears in the data. Never invent entities that are not listed. " +
        "Return at most 8 recommendations, ordered by expected impact. " +
        'Respond with JSON: {"recommendations":[{"entity_level":"campaign|ad_group|account","entity_id":"uuid or null",' +
        '"kind":"budget|bid|targeting|creative|structure|pacing|pause","title":"short imperative title, max 70 chars",' +
        '"detail":"2-3 sentences citing the metric and the expected outcome","impact_score":0-100,' +
        '"suggested_action":{"field":"...","from":"...","to":"..."}}]}. ' +
        "If the account has no delivery data yet, recommend setup/launch actions instead.",
      messages: [{ role: "user", content: JSON.stringify(payload).slice(0, 60000) }],
      json: true,
      maxTokens: 3000,
    });

    const recs = Array.isArray(result?.recommendations) ? result.recommendations.slice(0, 8) : [];

    // Replace previous unactioned suggestions with the fresh set.
    await admin.from("aap_recommendations").delete().eq("advertiser_id", advertiserId).eq("state", "new");

    if (recs.length) {
      const validIds = new Set([
        ...(campaigns ?? []).map((c: any) => c.id),
        ...(adGroups ?? []).map((g: any) => g.id),
      ]);
      await admin.from("aap_recommendations").insert(
        recs.map((r: any) => ({
          advertiser_id: advertiserId,
          entity_level: ["campaign", "ad_group", "account"].includes(r.entity_level) ? r.entity_level : "account",
          entity_id: validIds.has(r.entity_id) ? r.entity_id : null,
          kind: String(r.kind ?? "structure").slice(0, 40),
          title: String(r.title ?? "Optimisation").slice(0, 200),
          detail: String(r.detail ?? "").slice(0, 2000),
          impact_score: Math.max(0, Math.min(100, Number(r.impact_score ?? 50))),
          suggested_action: r.suggested_action ?? {},
          state: "new",
          model: "openai/gpt-5.6-sol",
        })),
      );
    }

    return new Response(JSON.stringify({ count: recs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("aap-recommendations failed:", err);
    return aiErrorResponse(err, corsHeaders);
  }
});
