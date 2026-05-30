import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (!callerId) return json({ error: "unauthorized" }, 401);

    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleRow } = await svc.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { request_id, action } = body ?? {};
    if (!request_id || !["approve", "reject"].includes(action)) return json({ error: "bad request" }, 400);

    const { data: vr } = await svc.from("verification_requests").select("user_id, category").eq("id", request_id).maybeSingle();
    if (!vr) return json({ error: "not found" }, 404);

    const status = action === "approve" ? "approved" : "rejected";
    await svc.from("verification_requests").update({ status, reviewed_at: new Date().toISOString() }).eq("id", request_id);

    if (action === "approve") {
      await svc.from("profiles").update({ verified: true, verification_kind: vr.category }).eq("user_id", vr.user_id);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
