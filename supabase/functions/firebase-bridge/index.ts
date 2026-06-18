// Verifies a Firebase ID token (phone-auth users) and mints a Supabase session
// for a matching Supabase auth user. New users are created on the fly so the
// existing `handle_new_user` trigger seeds their profile row.
//
// Returns { token_hash, email } — the client calls
// supabase.auth.verifyOtp({ type: "magiclink", token_hash }) to install the session.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Firebase publishes its public keys as a JWKS-compatible endpoint at:
// https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function syntheticEmail(uid: string) {
  return `${uid.toLowerCase()}@firebase.aurelix.local`;
}

async function findUserByEmail(email: string) {
  // listUsers is paginated; for a fresh signup the synthetic email is unique,
  // so we use the lower-level admin REST endpoint to query by email directly.
  const r = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${SERVICE_ROLE}`, apikey: SERVICE_ROLE } },
  );
  if (!r.ok) return null;
  const json = await r.json().catch(() => null);
  const list = json?.users ?? (Array.isArray(json) ? json : []);
  return list?.[0] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!PROJECT_ID) {
      return new Response(JSON.stringify({ error: "FIREBASE_PROJECT_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { idToken } = await req.json().catch(() => ({ idToken: null }));
    if (!idToken || typeof idToken !== "string") {
      return new Response(JSON.stringify({ error: "idToken required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Verify the Firebase ID token (signature + claims)
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const uid = String(payload.sub ?? payload.user_id ?? "");
    const phone = typeof payload.phone_number === "string" ? payload.phone_number : null;
    if (!uid) throw new Error("token missing subject");

    // 2) Find or create the matching Supabase user.
    // Phone auth signups have no real email, so we use a deterministic synthetic
    // address keyed on the Firebase UID. This stays stable across re-logins.
    const email = syntheticEmail(uid);
    let user = await findUserByEmail(email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        phone: phone ?? undefined,
        phone_confirm: !!phone,
        user_metadata: {
          firebase_uid: uid,
          phone_number: phone,
          provider: "firebase_phone",
        },
      });
      if (error) throw error;
      user = data.user;
    }

    // 3) Mint a one-shot magiclink token the client can exchange for a session.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr) throw linkErr;
    const token_hash = (linkData as any)?.properties?.hashed_token
      ?? (linkData as any)?.hashed_token;
    if (!token_hash) throw new Error("could not mint session token");

    return new Response(JSON.stringify({ token_hash, email, user_id: user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("firebase-bridge error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
