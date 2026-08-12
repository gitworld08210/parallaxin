// Verifies a Firebase ID token and mints a Supabase session
// for a matching Supabase auth user.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
      throw new Error("FIREBASE_PROJECT_ID not configured");
    }

    const { idToken } = await req.json().catch(() => ({ idToken: null }));
    if (!idToken || typeof idToken !== "string") {
      throw new Error("idToken required");
    }

    // 1) Verify the Firebase ID token
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    const uid = String(payload.sub ?? payload.user_id ?? "");
    const phone = typeof payload.phone_number === "string" ? payload.phone_number : null;
    const email = payload.email ? String(payload.email) : syntheticEmail(uid);
    if (!uid) throw new Error("token missing subject");

    // 2) Find or create the matching Supabase user.
    let user = await findUserByEmail(email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        id: uid, // Sync UIDs
        email,
        email_confirm: true,
        phone: phone ?? undefined,
        phone_confirm: !!phone,
        user_metadata: {
          firebase_uid: uid,
          full_name: typeof payload.name === 'string' ? payload.name : null,
          phone_number: phone,
          provider: (payload.firebase as any)?.sign_in_provider || "firebase",
        },
      });
      
      if (error) {
        if (error.message.includes("already exists")) {
           user = await findUserByEmail(email);
        } else {
           throw error;
        }
      } else {
        user = data.user;
      }
    }

    // 3) Mint a session token
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
    console.error("bridge error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
