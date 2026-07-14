import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const catToVerType = (c: string): string => {
  switch (c) {
    case "public_figure": return "public_figure";
    case "government": return "government";
    case "business": return "business";
    case "founder": return "creator";
    case "media": return "individual";
    default: return "individual";
  }
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
      .from("verification_requests")
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

    const applicationNumber = `VR-${new Date(row.created_at).getFullYear()}-${id.replace(/-/g, "").slice(0, 10)}`;

    const { data: app, error: appErr } = await admin
      .from("ver_applications")
      .insert({
        application_number: applicationNumber,
        ver_type: catToVerType(row.category),
        subject_user_id: row.user_id,
        subject_display_name: row.full_name,
        status: "pending",
        submitted_by: row.user_id,
        submission_notes: row.reason,
        metadata: {
          source: "verification_requests",
          source_id: row.id,
          organization: row.organization,
          official_email: row.official_email,
          country: row.country,
          dob: row.dob,
          links: row.links,
        },
      })
      .select("id")
      .single();

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: appErr?.message ?? "Failed to create application" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docs: Array<{ application_id: string; doc_type: string; file_url: string; uploaded_by: string }> = [];
    if (row.id_doc_url) docs.push({ application_id: app.id, doc_type: "id_document", file_url: row.id_doc_url, uploaded_by: row.user_id });
    if (row.supporting_doc_url) docs.push({ application_id: app.id, doc_type: "supporting_document", file_url: row.supporting_doc_url, uploaded_by: row.user_id });
    if (docs.length) await admin.from("ver_documents").insert(docs);

    await admin.from("ver_history").insert({
      application_id: app.id,
      event_type: "submitted",
      actor_id: row.user_id,
      details: { source: "verification_requests", source_id: row.id },
    });

    await admin.from("verification_requests").update({ ver_application_id: app.id }).eq("id", row.id);

    return new Response(JSON.stringify({ ok: true, application_id: app.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
