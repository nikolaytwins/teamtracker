import type { NextRequest } from "next/server";

/**
 * `Secure` on the session cookie must match how the browser loads the site.
 * Behind nginx (HTTPS → HTTP to Node) use X-Forwarded-Proto; otherwise the
 * browser may drop the cookie and login looks successful but nothing happens.
 */
export function sessionCookieSecure(request: NextRequest): boolean {
  if (process.env.TEAM_TRACKER_COOKIE_SECURE === "0") return false;
  if (process.env.TEAM_TRACKER_COOKIE_SECURE === "1") return true;
  const raw = request.headers.get("x-forwarded-proto");
  const proto = raw?.split(",")[0]?.trim().toLowerCase();
  if (proto === "https") return true;
  if (proto === "http") return false;
  if (process.env.NODE_ENV !== "production") return false;
  // Production, прямой доступ к Node без заголовка прокси (часто http://IP:PORT)
  return false;
}
