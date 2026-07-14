import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: readErr } = await userClient
      .from("kyc_submissions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readErr || !row) {
      return new Response(JSON.stringify({ error: "Not found or no access" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.ver_application_id) {
      return new Response(JSON.stringify({ ok: true, application_id: row.ver_application_id, already: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const applicationNumber = `KYC-${new Date(row.created_at).getFullYear()}-${id.replace(/-/g, "").slice(0, 10)}`;

    const { data: app, error: appErr } = await admin
      .from("ver_applications")
      .insert({
        application_number: applicationNumber,
        ver_type: "individual",
        subject_user_id: row.user_id,
        subject_display_name: row.full_name,
        status: "pending",
        submitted_by: row.user_id,
        metadata: {
          source: "kyc_submissions",
          source_id: row.id,
          pan_number: row.pan_number,
          bank_name: row.bank_name,
          bank_ifsc: row.bank_ifsc,
          bank_account_last4: String(row.bank_account_number || "").slice(-4),
        },
      })
      .select("id")
      .single();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: appErr?.message ?? "Failed to create application" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("ver_documents").insert([
      { application_id: app.id, doc_type: "kyc_id_photo", file_url: row.id_photo_url, uploaded_by: row.user_id },
      { application_id: app.id, doc_type: "kyc_passbook_photo", file_url: row.passbook_photo_url, uploaded_by: row.user_id },
    ]);

    await admin.from("ver_history").insert({
      application_id: app.id,
      event_type: "submitted",
      actor_id: row.user_id,
      details: { source: "kyc_submissions", source_id: row.id, kind: "kyc" },
    });

    await admin.from("kyc_submissions").update({ ver_application_id: app.id }).eq("id", row.id);

    return new Response(JSON.stringify({ ok: true, application_id: app.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
