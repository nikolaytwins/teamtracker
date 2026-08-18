import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  authorizationServerMetadata,
  authorizePage,
  completeAuthorize,
  exchangeToken,
  isAuthorized,
  protectedResourceMetadata,
  publicOrigin,
  registerClient,
  ensureClient,
  resourceUrl,
} from "./oauth.js";
import { createDiaryMcpServer } from "./server.js";

const PORT = Number(process.env.TT_MCP_PORT || 3107);
const transports = new Map<string, StreamableHTTPServerTransport>();

function sendJson(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...extra });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function parseForm(raw: string) {
  return new URLSearchParams(raw);
}

function parseJson(raw: string) {
  if (!raw.trim()) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

const server = createServer(async (req, res) => {
  try {
    const origin = publicOrigin();
    const url = new URL(req.url || "/", origin);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "Authorization, Content-Type, mcp-session-id");
    res.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && path === "/health") {
      sendJson(res, 200, { ok: true, resource: resourceUrl() });
      return;
    }

    if (
      req.method === "GET" &&
      (path === "/.well-known/oauth-authorization-server" ||
        path === "/mcp/.well-known/oauth-authorization-server")
    ) {
      sendJson(res, 200, authorizationServerMetadata());
      return;
    }
    if (
      req.method === "GET" &&
      (path === "/.well-known/oauth-protected-resource" ||
        path === "/.well-known/oauth-protected-resource/mcp" ||
        path === "/mcp/.well-known/oauth-protected-resource")
    ) {
      sendJson(res, 200, protectedResourceMetadata());
      return;
    }

    if (req.method === "POST" && path === "/oauth/register") {
      const body = parseJson(await readBody(req));
      const created = registerClient({ redirect_uris: body.redirect_uris as string[] | undefined });
      sendJson(res, 201, created);
      return;
    }

    if (req.method === "GET" && path === "/oauth/authorize") {
      ensureClient(url.searchParams.get("client_id") || "", url.searchParams.get("redirect_uri") || "");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(authorizePage(url.searchParams));
      return;
    }

    if (req.method === "POST" && path === "/oauth/authorize") {
      const form = parseForm(await readBody(req));
      const result = completeAuthorize(form);
      if (result.error) {
        const next = new URLSearchParams(form);
        next.set("error", result.error);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(authorizePage(next));
        return;
      }
      res.writeHead(302, { location: result.location! });
      res.end();
      return;
    }

    if (req.method === "POST" && path === "/oauth/token") {
      const raw = await readBody(req);
      const body = raw.includes("=") ? parseForm(raw) : new URLSearchParams(parseJson(raw) as Record<string, string>);
      try {
        sendJson(res, 200, exchangeToken(body));
      } catch {
        sendJson(res, 400, { error: "invalid_grant" });
      }
      return;
    }

    if (path === "/mcp") {
      if (!isAuthorized(req.headers.authorization)) {
        sendJson(
          res,
          401,
          { error: "unauthorized" },
          {
            "www-authenticate": `Bearer realm="mcp", resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"`,
          }
        );
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      if (req.method === "POST") {
        const raw = await readBody(req);
        const parsed = raw ? JSON.parse(raw) : undefined;
        let transport = sessionId ? transports.get(sessionId) : undefined;
        if (!transport && isInitializeRequest(parsed)) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports.set(sid, transport!);
            },
          });
          transport.onclose = () => {
            if (transport?.sessionId) transports.delete(transport.sessionId);
          };
          const mcp = createDiaryMcpServer();
          await mcp.connect(transport);
        }
        if (!transport) {
          sendJson(res, 400, { jsonrpc: "2.0", error: { code: -32000, message: "No session" }, id: null });
          return;
        }
        await transport.handleRequest(req, res, parsed);
        return;
      }
      if ((req.method === "GET" || req.method === "DELETE") && sessionId) {
        const transport = transports.get(sessionId);
        if (!transport) {
          sendJson(res, 404, { error: "session not found" });
          return;
        }
        await transport.handleRequest(req, res);
        return;
      }
      sendJson(res, 405, { error: "method not allowed" });
      return;
    }

    sendJson(res, 404, { error: "not found" });
  } catch (error) {
    console.error("tt-diary-mcp:", error);
    if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`tt-diary-mcp on 127.0.0.1:${PORT} resource=${resourceUrl()}`);
});
