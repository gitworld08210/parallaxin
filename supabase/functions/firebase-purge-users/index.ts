// Admin-only: deletes ALL Firebase Auth users + their profiles/usernames docs.
// Protected by CRON_SECRET.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function b64url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa: any, scopes: string[]) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const jwt = `${header}.${claim}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Token error: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const adminToken = req.headers.get("x-admin-token");
    if (!adminToken || adminToken !== Deno.env.get("CRON_SECRET")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sa = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") ?? "{}");
    const projectId = sa.project_id || Deno.env.get("FIREBASE_PROJECT_ID");
    const token = await getAccessToken(sa, [
      "https://www.googleapis.com/auth/identitytoolkit",
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/cloud-platform",
    ]);

    // 1. Delete all auth users (batched, 1000 at a time)
    let deleted = 0;
    for (let round = 0; round < 50; round++) {
      const listRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchGet?maxResults=1000`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const list = await listRes.json();
      const users = list.users ?? [];
      if (!users.length) break;
      const ids = users.map((u: any) => u.localId);
      await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchDelete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ localIds: ids, force: true }),
      });
      deleted += ids.length;
      if (users.length < 1000) break;
    }

    // 2. Wipe profiles / usernames / email_accounts collections
    const wipe = async (collection: string) => {
      let n = 0;
      for (let round = 0; round < 50; round++) {
        const res = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?pageSize=300`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const data = await res.json();
        const docs = data.documents ?? [];
        if (!docs.length) break;
        for (const d of docs) {
          await fetch(`https://firestore.googleapis.com/v1/${d.name}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          n++;
        }
        if (docs.length < 300) break;
      }
      return n;
    };

    const profiles = await wipe("profiles");
    const usernames = await wipe("usernames");
    const emailAccounts = await wipe("email_accounts");

    return new Response(JSON.stringify({ ok: true, deleted_users: deleted, profiles, usernames, emailAccounts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
