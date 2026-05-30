import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

async function embedText(text: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")! },
    body: JSON.stringify({ model: "google/gemini-embedding-001", input: text, dimensions: 768 }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).data[0].embedding as number[];
}

function avgVectors(vecs: number[][]): number[] {
  if (!vecs.length) return [];
  const out = new Array(vecs[0].length).fill(0);
  for (const v of vecs) for (let i = 0; i < v.length; i++) out[i] += v[i];
  // normalize
  for (let i = 0; i < out.length; i++) out[i] /= vecs.length;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Refresh user interest vector if missing or older than 6h
    const { data: uiv } = await admin.from("user_interest_vectors").select("updated_at").eq("user_id", user.id).maybeSingle();
    const stale = !uiv || (Date.now() - new Date(uiv.updated_at).getTime()) > 6 * 3600 * 1000;

    if (stale) {
      // Gather signals: liked + saved + viewed posts in last 14d
      const since = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
      const [likes, saves, views, profile] = await Promise.all([
        admin.from("likes").select("post_id, created_at").eq("user_id", user.id).gte("created_at", since).limit(50),
        admin.from("saves").select("post_id, created_at").eq("user_id", user.id).gte("created_at", since).limit(50),
        admin.from("post_views").select("post_id, created_at").eq("viewer_id", user.id).gte("created_at", since).limit(100),
        admin.from("profiles").select("interests").eq("user_id", user.id).maybeSingle(),
      ]);
      const ids = new Set<string>();
      (likes.data ?? []).forEach((x: any) => ids.add(x.post_id));
      (saves.data ?? []).forEach((x: any) => ids.add(x.post_id));
      (views.data ?? []).forEach((x: any) => ids.add(x.post_id));

      let vecs: number[][] = [];
      if (ids.size > 0) {
        const { data: embeds } = await admin.from("post_embeddings").select("embedding").in("post_id", Array.from(ids));
        vecs = (embeds ?? []).map((e: any) => Array.isArray(e.embedding) ? e.embedding : JSON.parse(e.embedding));
      }

      // Cold start: seed from interests text
      if (!vecs.length) {
        const interests: string[] = profile.data?.interests ?? [];
        const seedText = interests.length ? interests.join(", ") : "art photography travel music culture creators";
        try {
          const seed = await embedText(seedText);
          vecs = [seed];
        } catch (_) { /* fall through */ }
      }

      if (vecs.length) {
        const avg = avgVectors(vecs);
        await admin.from("user_interest_vectors").upsert({ user_id: user.id, embedding: avg as any, updated_at: new Date().toISOString() });
      }
    }

    // Now rank using DB function
    const { data: ranked, error: rerr } = await admin.rpc("match_posts_for_user", { _user_id: user.id, _match_count: 30 });
    if (rerr) return new Response(JSON.stringify({ error: rerr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const post_ids = (ranked ?? []).map((r: any) => r.post_id);
    return new Response(JSON.stringify({ post_ids }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
