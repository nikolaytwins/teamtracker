import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

type Client = { client_id: string; redirect_uris: string[] };
type AuthCode = {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  expires: number;
};
type AccessToken = { token: string; expires: number };

const clients = new Map<string, Client>();
const codes = new Map<string, AuthCode>();
const tokens = new Map<string, AccessToken>();

export function publicOrigin() {
  return (process.env.TT_MCP_PUBLIC_ORIGIN || "https://tt.twinlabs.ru").replace(/\/+$/, "");
}

export function resourceUrl() {
  return `${publicOrigin()}/mcp`;
}

function integrationSecret() {
  return (process.env.TT_INTEGRATION_SECRET || "").trim();
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isAuthorized(header: string | undefined): boolean {
  if (!header) return false;
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  const secret = integrationSecret();
  if (secret.length >= 16 && safeEqual(token, secret)) return true;
  const row = tokens.get(token);
  if (!row) return false;
  if (row.expires < Date.now()) {
    tokens.delete(token);
    return false;
  }
  return true;
}

export function authorizationServerMetadata() {
  const origin = publicOrigin();
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/oauth/token`,
    registration_endpoint: `${origin}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["diary.read"],
  };
}

export function protectedResourceMetadata() {
  const origin = publicOrigin();
  return {
    resource: resourceUrl(),
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["diary.read"],
  };
}

export function registerClient(body: { redirect_uris?: string[] }) {
  const redirect_uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.map(String) : [];
  if (redirect_uris.length === 0) {
    throw new Error("redirect_uris required");
  }
  const client_id = `tt_${randomBytes(12).toString("hex")}`;
  clients.set(client_id, { client_id, redirect_uris });
  return {
    client_id,
    redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  };
}

export function ensureClient(client_id: string, redirect_uri: string) {
  if (!client_id || !redirect_uri) return false;
  const existing = clients.get(client_id);
  if (existing) {
    if (!existing.redirect_uris.includes(redirect_uri)) existing.redirect_uris.push(redirect_uri);
    return true;
  }
  if (!/^https:\/\//.test(redirect_uri)) return false;
  clients.set(client_id, { client_id, redirect_uris: [redirect_uri] });
  return true;
}

export function authorizePage(query: URLSearchParams): string {
  const client_id = query.get("client_id") || "";
  const redirect_uri = query.get("redirect_uri") || "";
  const state = query.get("state") || "";
  const code_challenge = query.get("code_challenge") || "";
  const error = query.get("error") || "";
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Дневник Team Tracker</title>
<style>
  body{font-family:ui-sans-serif,system-ui;max-width:28rem;margin:12vh auto;padding:0 1rem;color:#111}
  input,button{font:inherit;padding:.6rem .8rem;width:100%;box-sizing:border-box}
  button{margin-top:.8rem;background:#111;color:#fff;border:0;border-radius:8px;cursor:pointer}
  .err{color:#b91c1c;margin-bottom:1rem}
</style></head><body>
<h1>Дневник Team Tracker</h1>
<p>MCP только на чтение. Введи интеграционный секрет Team Tracker.</p>
${error ? `<p class="err">${escapeHtml(error)}</p>` : ""}
<form method="post" action="/oauth/authorize">
  <input type="hidden" name="client_id" value="${escapeHtml(client_id)}">
  <input type="hidden" name="redirect_uri" value="${escapeHtml(redirect_uri)}">
  <input type="hidden" name="state" value="${escapeHtml(state)}">
  <input type="hidden" name="code_challenge" value="${escapeHtml(code_challenge)}">
  <input type="password" name="secret" placeholder="TT_INTEGRATION_SECRET" required>
  <button type="submit">Разрешить чтение</button>
</form>
</body></html>`;
}

export function completeAuthorize(form: URLSearchParams): { location?: string; error?: string } {
  const secret = form.get("secret") || "";
  const expected = integrationSecret();
  if (expected.length < 16 || !safeEqual(secret, expected)) {
    return { error: "Неверный секрет" };
  }
  const client_id = form.get("client_id") || "";
  const redirect_uri = form.get("redirect_uri") || "";
  const state = form.get("state") || "";
  const code_challenge = form.get("code_challenge") || "";
  if (!ensureClient(client_id, redirect_uri)) {
    return { error: "Неизвестный клиент или redirect_uri" };
  }
  const code = randomBytes(24).toString("hex");
  codes.set(code, {
    code,
    client_id,
    redirect_uri,
    code_challenge,
    expires: Date.now() + 5 * 60 * 1000,
  });
  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  return { location: url.toString() };
}

export function exchangeToken(body: URLSearchParams) {
  const code = body.get("code") || "";
  const redirect_uri = body.get("redirect_uri") || "";
  const code_verifier = body.get("code_verifier") || "";
  const row = codes.get(code);
  if (!row || row.expires < Date.now() || row.redirect_uri !== redirect_uri) {
    throw new Error("invalid_grant");
  }
  codes.delete(code);
  if (row.code_challenge) {
    const digest = createHash("sha256").update(code_verifier).digest();
    const challenge = digest.toString("base64url");
    if (challenge !== row.code_challenge) throw new Error("invalid_grant");
  }
  const token = randomBytes(32).toString("hex");
  tokens.set(token, { token, expires: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: 30 * 24 * 60 * 60,
    scope: "diary.read",
  };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
