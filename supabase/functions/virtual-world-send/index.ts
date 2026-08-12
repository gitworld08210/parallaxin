import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const E164 = /^\+[1-9]\d{7,14}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.slice(7);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const asUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // With Firebase migration, we need to ensure the Supabase user exists or fallback to direct JWT check if claims are missing.
    const { data: { user: supabaseUser }, error: userErr } = await asUser.auth.getUser();
    if (userErr || !supabaseUser) {
      console.error("Supabase user not found via token:", userErr);
      return json({ error: "Unauthorized: User session invalid" }, 401);
    }
    const userId = supabaseUser.id;

    const payload = await req.json().catch(() => null);
    const channel = String(payload?.channel ?? "");
    const to = String(payload?.to ?? "").trim();
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";

    if (!["sms", "whatsapp", "voice"].includes(channel)) {
      return json({ error: "Invalid channel" }, 400);
    }
    if (!E164.test(to)) {
      return json({ error: "Number must be in international format, e.g. +919876543210" }, 400);
    }
    if (channel !== "voice" && (message.length < 1 || message.length > 1000)) {
      return json({ error: "Message must be between 1 and 1000 characters" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Access gate — must be approved by the Verification department
    const { data: access } = await admin
      .from("virtual_world_access")
      .select("is_active, daily_limit")
      .eq("user_id", userId)
      .maybeSingle();

    if (!access?.is_active) {
      return json({ error: "Virtual World access is not approved for this account." }, 403);
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("virtual_world_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);

    if ((count ?? 0) >= (access.daily_limit ?? 25)) {
      return json({ error: "Daily limit reached. Try again tomorrow." }, 429);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      return json({ error: "Twilio is not configured yet." }, 500);
    }

    const smsFrom = Deno.env.get("TWILIO_FROM_NUMBER");
    const waFrom = Deno.env.get("TWILIO_WHATSAPP_FROM");

    let path = "/Messages.json";
    const form = new URLSearchParams();

    if (channel === "sms") {
      if (!smsFrom) return json({ error: "Company SMS number not configured." }, 500);
      form.set("From", smsFrom);
      form.set("To", to);
      form.set("Body", message);
    } else if (channel === "whatsapp") {
      if (!waFrom) return json({ error: "Company WhatsApp sender not configured." }, 500);
      form.set("From", waFrom.startsWith("whatsapp:") ? waFrom : `whatsapp:${waFrom}`);
      form.set("To", `whatsapp:${to}`);
      form.set("Body", message);
    } else {
      if (!smsFrom) return json({ error: "Company voice number not configured." }, 500);
      // Bridge: Twilio rings the caller's own verified phone, then dials the target
      // from the shared company number so the personal number is never revealed.
      const legTo = String(payload?.callerPhone ?? "").trim();
      if (!E164.test(legTo)) {
        return json({ error: "Your verified phone number is required for calls." }, 400);
      }
      path = "/Calls.json";
      form.set("From", smsFrom);
      form.set("To", legTo);
      form.set(
        "Twiml",
        `<Response><Say>Connecting your Aurelix Virtual World call.</Say><Dial callerId="${smsFrom}"><Number>${to}</Number></Dial></Response>`,
      );
    }

    const res = await fetch(`${GATEWAY_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error(`Twilio request failed [${res.status}]: ${raw}`);
      await admin.from("virtual_world_logs").insert({
        user_id: userId,
        channel,
        to_number: to,
        body: channel === "voice" ? null : message,
        status: "failed",
        error: raw.slice(0, 500),
      });
      return json({ error: "Provider request failed", status: res.status, details: raw }, res.status);
    }

    const data = JSON.parse(raw);
    await admin.from("virtual_world_logs").insert({
      user_id: userId,
      channel,
      to_number: to,
      body: channel === "voice" ? null : message,
      provider_sid: data.sid ?? null,
      status: data.status ?? "queued",
    });

    return json({ ok: true, sid: data.sid, status: data.status });
  } catch (e) {
    console.error("virtual-world-send error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
