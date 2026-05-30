// Rank-explore: returns up to 60 recent published posts ranked by an engagement+recency score,
// excluding blocked/muted users for the requester.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: { user } } = await supabase.auth.getUser();

  const excluded = new Set<string>();
  if (user) {
    const [bOut, bIn, mu] = await Promise.all([
      admin.from("blocks").select("blocked_id").eq("blocker_id", user.id),
      admin.from("blocks").select("blocker_id").eq("blocked_id", user.id),
      admin.from("mutes").select("muted_id").eq("muter_id", user.id),
    ]);
    (bOut.data ?? []).forEach((x: any) => excluded.add(x.blocked_id));
    (bIn.data ?? []).forEach((x: any) => excluded.add(x.blocker_id));
    (mu.data ?? []).forEach((x: any) => excluded.add(x.muted_id));
  }

  // Exclude posts from private accounts (the requester's own posts are fine, but
  // explore is a public-discovery surface so we hide all private accounts here).
  const { data: privateProfiles } = await admin
    .from("profiles")
    .select("user_id")
    .eq("is_private", true);
  (privateProfiles ?? []).forEach((p: any) => {
    if (!user || p.user_id !== user.id) excluded.add(p.user_id);
  });

  // 200 newest public posts (excluding reels), then re-rank
  const { data: posts } = await admin
    .from("posts")
    .select("id, user_id, content, media_url, media_type, like_count, comment_count, created_at, profile:profiles!posts_user_profile_fkey(username, display_name, avatar_url, verified, verification_kind)")
    .eq("status", "published")
    .eq("is_reel", false)
    .not("media_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  const now = Date.now();
  const ranked = (posts ?? [])
    .filter((p: any) => !excluded.has(p.user_id))
    .map((p: any) => {
      const ageHours = Math.max(1, (now - new Date(p.created_at).getTime()) / 36e5);
      const engagement = p.like_count * 1 + p.comment_count * 2;
      const score = engagement / Math.pow(ageHours + 2, 1.2);
      return { ...p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);

  return new Response(JSON.stringify({ posts: ranked }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
