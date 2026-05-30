// Suggest-users: scores candidate profiles by (mutual follows * 3 + shared hashtag affinity).
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
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1) Who I already follow / blocks / mutes
  const [following, blocksOut, blocksIn, mutes] = await Promise.all([
    admin.from("follows").select("following_id").eq("follower_id", user.id),
    admin.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    admin.from("blocks").select("blocker_id").eq("blocked_id", user.id),
    admin.from("mutes").select("muted_id").eq("muter_id", user.id),
  ]);
  const excluded = new Set<string>([user.id]);
  (following.data ?? []).forEach((f: any) => excluded.add(f.following_id));
  (blocksOut.data ?? []).forEach((b: any) => excluded.add(b.blocked_id));
  (blocksIn.data ?? []).forEach((b: any) => excluded.add(b.blocker_id));
  (mutes.data ?? []).forEach((m: any) => excluded.add(m.muted_id));

  const followingIds = (following.data ?? []).map((f: any) => f.following_id);

  // 2) Mutual: people followed by people I follow
  const score = new Map<string, number>();
  if (followingIds.length) {
    const { data: secondHop } = await admin
      .from("follows")
      .select("following_id")
      .in("follower_id", followingIds)
      .limit(2000);
    (secondHop ?? []).forEach((row: any) => {
      const id = row.following_id;
      if (excluded.has(id)) return;
      score.set(id, (score.get(id) ?? 0) + 3);
    });
  }

  // 3) Topic affinity: top hashtags from my recent likes -> creators using them
  const { data: myLikes } = await admin
    .from("likes")
    .select("post_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const likedIds = (myLikes ?? []).map((l: any) => l.post_id);
  const tagAffinity = new Map<string, number>();
  if (likedIds.length) {
    const { data: likedPosts } = await admin
      .from("posts")
      .select("content")
      .in("id", likedIds);
    (likedPosts ?? []).forEach((p: any) => {
      const tags = (p.content || "").match(/#\w+/g) ?? [];
      tags.forEach((t: string) => tagAffinity.set(t.toLowerCase(), (tagAffinity.get(t.toLowerCase()) ?? 0) + 1));
    });
  }

  const topTags = [...tagAffinity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  if (topTags.length) {
    const orExpr = topTags.map((t) => `content.ilike.%${t}%`).join(",");
    const { data: tagPosts } = await admin
      .from("posts")
      .select("user_id")
      .or(orExpr)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(500);
    (tagPosts ?? []).forEach((p: any) => {
      if (excluded.has(p.user_id)) return;
      score.set(p.user_id, (score.get(p.user_id) ?? 0) + 1);
    });
  }

  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  // 4) Hydrate profiles
  const ids = ranked.map(([id]) => id);
  if (ids.length === 0) {
    return new Response(JSON.stringify({ users: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, verified, verification_kind, followers_count, bio")
    .in("user_id", ids);

  const byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  const users = ranked
    .map(([id, s]) => ({ ...(byId.get(id) ?? {}), score: s }))
    .filter((u: any) => u.username);

  return new Response(JSON.stringify({ users }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
