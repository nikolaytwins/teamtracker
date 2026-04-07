export type SessionPayload = {
  sub: string;
  login: string;
  name: string;
  title: string;
  exp: number;
};

const encoder = new TextEncoder();

export function getAuthSecret(): string {
  return (
    process.env.TEAM_TRACKER_AUTH_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "dev-insecure-tt-session-secret")
  );
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const sig = Buffer.from(sigBuf).toString("base64url");
  return `${payloadB64}.${sig}`;
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  if (!secret) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const payloadB64 = token.slice(0, i);
  const sigB64 = token.slice(i + 1);
  let sigBytes: Uint8Array;
  try {
    sigBytes = new Uint8Array(Buffer.from(sigB64, "base64url"));
  } catch {
    return null;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes as unknown as BufferSource,
    encoder.encode(payloadB64)
  );
  if (!ok) return null;
  let json: string;
  try {
    json = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  let data: SessionPayload;
  try {
    data = JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
  if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
  if (!data.sub || !data.name) return null;
  return data;
}
