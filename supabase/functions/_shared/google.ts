// Shared Google/Firebase helpers for privileged Edge Functions.
//
// Deliberately dependency-free and matching the hand-rolled WebCrypto style
// already used by `firebase-purge-users`, so these functions have no supply
// chain beyond Deno itself.
//
// Two distinct credentials are involved and must not be confused:
//   - The *caller's* Firebase ID token proves who is making the request.
//     It is verified against Google's public JWKS. Never trust its claims
//     before verification.
//   - The *service account* grants this function privileged Firestore access.
//     It bypasses security rules entirely, so every write path built on it
//     must perform its own authorization checks.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// base64url
// ---------------------------------------------------------------------------

function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Uint8Array {
  const padding = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/") + padding;
  const bin = atob(normalized);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// ---------------------------------------------------------------------------
// Service account access tokens
// ---------------------------------------------------------------------------

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export function loadServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");

  let parsed: ServiceAccount;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
  }
  return parsed;
}

export function resolveProjectId(sa: ServiceAccount): string {
  const projectId = sa.project_id || Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) throw new Error("Unable to resolve the Firebase project id");
  return projectId;
}

const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function getAccessToken(
  sa: ServiceAccount,
  scopes: string[],
): Promise<string> {
  // Tokens are valid for an hour; refresh a minute early to avoid handing back
  // one that expires mid-request.
  const cacheKey = `${sa.client_email}:${scopes.join(" ")}`;
  const cached = accessTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

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
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${b64url(sig)}`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Failed to mint access token: ${JSON.stringify(json)}`);
  }

  const lifetime = Number(json.expires_in ?? 3600);
  accessTokenCache.set(cacheKey, {
    token: json.access_token as string,
    expiresAt: Date.now() + Math.max(lifetime - 60, 0) * 1000,
  });
  return json.access_token as string;
}

// ---------------------------------------------------------------------------
// Firebase ID token verification
// ---------------------------------------------------------------------------

const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
}

let jwksCache: { keys: Jwk[]; expiresAt: number } | null = null;

async function fetchJwks(force = false): Promise<Jwk[]> {
  if (!force && jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys;

  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`Unable to fetch Google JWKS (${res.status})`);
  const body = await res.json();
  const keys: Jwk[] = body.keys ?? [];
  if (!keys.length) throw new Error("Google JWKS response contained no keys");

  // Respect Cache-Control, but floor it so a `max-age=0` response cannot turn
  // every verification into a network round trip.
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAge = Math.max(
    Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? 3600),
    300,
  );
  jwksCache = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

/**
 * Resolves a signing key, refetching once if the key id is unknown.
 *
 * Google rotates signing keys well inside the JWKS cache lifetime. Without the
 * forced refetch a warm isolate would reject every token until its cache
 * expired, taking down the only coin-crediting path for hours.
 */
async function findSigningKey(kid: string): Promise<Jwk> {
  const cached = (await fetchJwks()).find((k) => k.kid === kid);
  if (cached) return cached;

  const refreshed = (await fetchJwks(true)).find((k) => k.kid === kid);
  if (refreshed) return refreshed;

  throw new Error("ID token was signed by an unknown key");
}

export interface VerifiedIdToken {
  uid: string;
  email?: string;
  claims: Record<string, unknown>;
}

/**
 * Verifies a Firebase ID token's signature and claims.
 *
 * Throws on any failure. A thrown error must be treated as "unauthenticated",
 * never as "authenticated with unknown identity".
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
): Promise<VerifiedIdToken> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token");

  const [rawHeader, rawPayload, rawSignature] = parts;

  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlDecode(rawHeader)));
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(rawPayload)));
  } catch {
    throw new Error("ID token header or payload is not valid JSON");
  }

  if (header.alg !== "RS256") {
    throw new Error(`Unexpected ID token algorithm: ${header.alg}`);
  }
  if (!header.kid) throw new Error("ID token is missing a key id");

  const jwk = await findSigningKey(header.kid);

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlDecode(rawSignature),
    new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
  );
  if (!validSignature) throw new Error("ID token signature is invalid");

  // Claim checks. A valid signature alone does not prove the token was minted
  // for this project or is still current.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const skew = 60;

  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("ID token issuer does not match this project");
  }
  if (payload.aud !== projectId) {
    throw new Error("ID token audience does not match this project");
  }
  if (typeof payload.exp !== "number" || payload.exp + skew < nowSeconds) {
    throw new Error("ID token has expired");
  }
  if (typeof payload.iat !== "number" || payload.iat - skew > nowSeconds) {
    throw new Error("ID token was issued in the future");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("ID token has no subject");
  }

  return {
    uid: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    claims: payload,
  };
}

// ---------------------------------------------------------------------------
// Firestore REST value encoding
// ---------------------------------------------------------------------------

const TIMESTAMP_MARKER = "__firestoreTimestamp";

export function fsTimestamp(date: Date = new Date()) {
  return { [TIMESTAMP_MARKER]: date.toISOString() } as const;
}

type FirestoreValue = Record<string, unknown>;

function encodeValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };

  if (typeof value === "object" && TIMESTAMP_MARKER in (value as object)) {
    return {
      timestampValue: (value as Record<string, string>)[TIMESTAMP_MARKER],
    };
  }
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  }
  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

export function encodeFields(
  data: Record<string, unknown>,
): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = encodeValue(value);
  }
  return fields;
}

function decodeValue(value: FirestoreValue): unknown {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] }).values ?? [];
    return values.map(decodeValue);
  }
  if ("mapValue" in value) {
    const fields = (value.mapValue as { fields?: Record<string, FirestoreValue> }).fields ?? {};
    return decodeFields(fields);
  }
  return null;
}

export function decodeFields(
  fields: Record<string, FirestoreValue>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Firestore REST client (transaction aware)
// ---------------------------------------------------------------------------

export interface FirestoreWrite {
  update: { name: string; fields: Record<string, FirestoreValue> };
  updateMask?: { fieldPaths: string[] };
  currentDocument?: { exists: boolean };
}

/** Thrown when a transaction loses a race and the caller may retry. */
export class TransactionContention extends Error {}

export class Firestore {
  private readonly base: string;

  constructor(private readonly projectId: string, private readonly token: string) {
    this.base =
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  }

  docName(collection: string, id: string): string {
    return `projects/${this.projectId}/databases/(default)/documents/${collection}/${id}`;
  }

  private async call(suffix: string, body: unknown): Promise<Response> {
    return await fetch(`${this.base}${suffix}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  async beginTransaction(): Promise<string> {
    const res = await this.call(":beginTransaction", { options: { readWrite: {} } });
    const json = await res.json();
    if (!res.ok || !json.transaction) {
      throw new Error(`beginTransaction failed: ${JSON.stringify(json)}`);
    }
    return json.transaction as string;
  }

  async rollback(transaction: string): Promise<void> {
    // Best effort: the transaction expires on its own if this fails.
    try {
      await this.call(":rollback", { transaction });
    } catch {
      // ignored
    }
  }

  /**
   * Reads documents inside a transaction. A document Firestore reports as
   * missing resolves to null.
   *
   * Every requested name must come back either found or missing. A silent gap
   * is treated as a failure rather than as an absent document, because callers
   * compute balances from these reads and "unknown" must never be mistaken for
   * "zero".
   */
  async batchGet(
    names: string[],
    transaction?: string,
  ): Promise<Map<string, Record<string, unknown> | null>> {
    const res = await this.call(":batchGet", {
      documents: names,
      ...(transaction ? { transaction } : {}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`batchGet failed: ${JSON.stringify(json)}`);

    const out = new Map<string, Record<string, unknown> | null>();
    for (const entry of json as Array<Record<string, unknown>>) {
      if (entry.found) {
        const found = entry.found as {
          name: string;
          fields?: Record<string, FirestoreValue>;
        };
        out.set(found.name, decodeFields(found.fields ?? {}));
      } else if (entry.missing) {
        out.set(entry.missing as string, null);
      }
    }

    for (const name of names) {
      if (!out.has(name)) {
        throw new Error(`batchGet returned no result for ${name}`);
      }
    }
    return out;
  }

  async commit(transaction: string, writes: FirestoreWrite[]): Promise<void> {
    const res = await this.call(":commit", { transaction, writes });
    if (res.ok) return;

    const json = await res.json().catch(() => ({}));
    const status = (json as { error?: { status?: string } }).error?.status;
    const message = JSON.stringify(json);

    // ABORTED means another transaction touched the same documents.
    // FAILED_PRECONDITION means an `exists` precondition no longer holds,
    // which happens when a concurrent reviewer already wrote the ledger or
    // receipt. Both are safe to retry: the retry re-reads the top-up, sees the
    // terminal status, and reports "already processed" instead of crediting.
    if (status === "ABORTED" || status === "FAILED_PRECONDITION" || res.status === 409) {
      throw new TransactionContention(message);
    }
    throw new Error(`commit failed: ${message}`);
  }
}

/** Merge-writes the listed fields, leaving all other fields untouched. */
export function mergeWrite(
  name: string,
  data: Record<string, unknown>,
  options: { mustExist?: boolean } = {},
): FirestoreWrite {
  return {
    update: { name, fields: encodeFields(data) },
    updateMask: { fieldPaths: Object.keys(data) },
    ...(options.mustExist ? { currentDocument: { exists: true } } : {}),
  };
}

/** Creates a document and fails if it already exists. */
export function createWrite(
  name: string,
  data: Record<string, unknown>,
): FirestoreWrite {
  return {
    update: { name, fields: encodeFields(data) },
    currentDocument: { exists: false },
  };
}
