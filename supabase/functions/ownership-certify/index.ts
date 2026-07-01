// Generate a content ownership certificate: SHA-256 the post media,
// store the cert, and stamp the hash with an OpenTimestamps calendar.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OTS_CALENDARS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://alice.btc.calendar.opentimestamps.org",
];

const hex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

const sha256 = async (data: ArrayBuffer) => hex(await crypto.subtle.digest("SHA-256", data));

const stampHash = async (digestHex: string): Promise<Uint8Array | null> => {
  const digest = new Uint8Array(digestHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  for (const cal of OTS_CALENDARS) {
    try {
      const res = await fetch(`${cal}/digest`, {
        method: "POST",
        headers: { "Content-Type": "application/vnd.opentimestamps.v1", Accept: "application/vnd.opentimestamps.v1" },
        body: digest,
      });
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
    } catch (_) { /* try next */ }
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: ures } = await userClient.auth.getUser();
    const user = ures?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const post_id = body?.post_id;
    if (!post_id || typeof post_id !== "string") {
      return new Response(JSON.stringify({ error: "post_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify ownership + fetch media
    const { data: post, error: pErr } = await supabase
      .from("posts")
      .select("id, user_id, media_url, media_type, has_certificate")
      .eq("id", post_id)
      .single();
    if (pErr || !post) return new Response(JSON.stringify({ error: "post not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (post.user_id !== user.id) return new Response(JSON.stringify({ error: "not your post" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!post.media_url || !post.media_type) return new Response(JSON.stringify({ error: "post has no media to certify" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Idempotent: return existing cert
    const { data: existing } = await supabase.from("ownership_certificates").select("id, content_hash").eq("post_id", post_id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ certificate_id: existing.id, content_hash: existing.content_hash, already: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SSRF guard: only allow fetching media from our own Supabase Storage.
    const allowedPrefix = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/`;
    if (!post.media_url.startsWith(allowedPrefix)) {
      return new Response(JSON.stringify({ error: "invalid media URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Download media
    const mediaRes = await fetch(post.media_url);
    if (!mediaRes.ok) return new Response(JSON.stringify({ error: "could not fetch media" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const buf = await mediaRes.arrayBuffer();
    const digestHex = await sha256(buf);

    // Check for earlier cert with same hash (informational only)
    const { data: prior } = await supabase
      .from("ownership_certificates")
      .select("creator_id, created_at, post_id, profiles:profiles!ownership_certificates_creator_id_fkey(username)")
      .eq("content_hash", digestHex)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Stamp with OpenTimestamps (best-effort)
    const otsBytes = await stampHash(digestHex);

    // Insert cert (service role bypasses RLS)
    const { data: inserted, error: iErr } = await supabase
      .from("ownership_certificates")
      .insert({
        post_id,
        creator_id: user.id,
        content_hash: digestHex,
        media_url: post.media_url,
        media_type: post.media_type,
        ots_proof: otsBytes ? `\\x${hex(otsBytes.buffer)}` : null,
        ots_status: otsBytes ? "pending" : "failed",
        ots_last_attempt_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (iErr) throw iErr;

    await supabase.from("posts").update({ has_certificate: true }).eq("id", post_id);

    return new Response(JSON.stringify({
      certificate_id: inserted.id,
      content_hash: digestHex,
      ots_status: otsBytes ? "pending" : "failed",
      duplicate_of: prior && prior.creator_id !== user.id ? { created_at: prior.created_at, post_id: prior.post_id } : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
