import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } },
  );
  const { data: userData } = await supa.auth.getUser();
  const user = userData?.user;
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: last } = await admin.from("data_export_requests").select("created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 24 * 60 * 60 * 1000) {
    return new Response(JSON.stringify({ error: "You can export once every 24 hours." }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  await admin.from("data_export_requests").insert({ user_id: user.id });

  const grab = async (table: string, col = "user_id") =>
    (await admin.from(table).select("*").eq(col, user.id)).data || [];

  const archive = {
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email, created_at: user.created_at },
    profile: (await admin.from("profiles").select("*").eq("user_id", user.id).maybeSingle()).data,
    posts: await grab("posts"),
    comments: await grab("comments"),
    follows: (await admin.from("follows").select("*").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)).data || [],
    saves: await grab("saves"),
    likes: await grab("likes"),
    notifications: await grab("notifications"),
    stories: await grab("stories"),
    highlights: await grab("story_highlights"),
    messages: (await admin.from("messages").select("*").eq("sender_id", user.id)).data || [],
  };

  return new Response(JSON.stringify(archive), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
