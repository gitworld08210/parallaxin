import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const highSev = new Set(["violence", "hate", "nudity"]);

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
      .from("reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readErr || !row) {
      return new Response(JSON.stringify({ error: "Not found or no access" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (row.ts_case_id) {
      return new Response(JSON.stringify({ ok: true, case_id: row.ts_case_id, already: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subjectUserId: string | null = null;
    if (row.target_kind === "profile") {
      subjectUserId = row.target_id;
    } else if (row.target_kind === "post") {
      const { data } = await admin.from("posts").select("user_id").eq("id", row.target_id).maybeSingle();
      subjectUserId = data?.user_id ?? null;
    } else if (row.target_kind === "comment") {
      const { data } = await admin.from("comments").select("user_id").eq("id", row.target_id).maybeSingle();
      subjectUserId = data?.user_id ?? null;
    } else if (row.target_kind === "message") {
      const { data } = await admin.from("messages").select("sender_id").eq("id", row.target_id).maybeSingle();
      subjectUserId = data?.sender_id ?? null;
    }

    const severity = highSev.has(row.reason) ? "high" : "medium";
    const priority = highSev.has(row.reason) ? "high" : "normal";

    const { data: caseRow, error: caseErr } = await admin
      .from("ts_cases")
      .insert({
        category: row.reason,
        severity,
        status: "new",
        source: "user_report",
        reporter_id: row.reporter_id,
        subject_user_id: subjectUserId,
        subject_content_type: row.target_kind === "profile" ? null : row.target_kind,
        subject_content_id: row.target_kind === "profile" ? null : row.target_id,
        title: `Report: ${row.reason} on ${row.target_kind}`,
        description: row.details,
        priority,
        created_by: row.reporter_id,
      })
      .select("id")
      .single();

    if (caseErr || !caseRow) {
      return new Response(JSON.stringify({ error: caseErr?.message ?? "Failed to create case" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("ts_case_timeline").insert({
      case_id: caseRow.id,
      event_type: "case_opened",
      actor_id: row.reporter_id,
      description: "Reported by user",
      metadata: { source: "reports", source_id: row.id },
    });

    await admin.from("reports").update({ ts_case_id: caseRow.id }).eq("id", row.id);

    return new Response(JSON.stringify({ ok: true, case_id: caseRow.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
