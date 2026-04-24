import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canAccessAgencyRoutes, isMemberRestrictedRole, sessionRole } from "@/lib/roles";
import { getAuthSecret, verifySession } from "@/lib/session-token";

/**
 * За nginx `request.url` часто даёт http://127.0.0.1:PORT — редиректы превращаются в https://localhost:3005/...
 * Берём явный origin из env или из X-Forwarded-* / Host.
 */
function publicSiteOrigin(request: NextRequest): string {
  /** На VPS с nginx без корректных forwarded-заголовков — задайте в systemd (см. deploy/). */
  const forced = process.env.TEAM_TRACKER_PUBLIC_ORIGIN?.trim().replace(/\/+$/, "");
  if (forced) return forced;

  const rawXfh = request.headers.get("x-forwarded-host");
  const host = (rawXfh?.split(",")[0]?.trim() ||
    request.headers.get("host")?.split(",")[0]?.trim() ||
    request.nextUrl.hostname) as string;
  const rawProto = request.headers.get("x-forwarded-proto");
  const firstProto = rawProto?.split(",")[0]?.trim().toLowerCase();
  const proto =
    firstProto === "https" || firstProto === "http"
      ? firstProto
      : request.nextUrl.protocol.replace(":", "") === "https"
        ? "https"
        : "http";
  return `${proto}://${host}`;
}

/** Абсолютный URL с учётом NEXT_PUBLIC_BASE_PATH (например /login → /pm-board/login). */
function appAbsoluteUrl(request: NextRequest, pathSuffix: string): URL {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const origin = publicSiteOrigin(request);
  const suf = pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`;
  const fullPath = (basePath + suf).replace(/\/+/g, "/");
  return new URL(fullPath, `${origin}/`);
}

function normalizePath(pathname: string, basePath: string): string {
  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const pathname = normalizePath(request.nextUrl.pathname, basePath);

  /** Машинный доступ из Sophia OS (секрет в env). Без браузерной сессии Teamtracker. */
  if (pathname.startsWith("/api/integrations/sophia/")) {
    const envSecret = process.env.TT_INTEGRATION_SECRET ?? "";
    const headerSecret = request.headers.get("x-tt-integration-secret") ?? "";
    if (envSecret.length >= 16 && headerSecret === envSecret) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = request.cookies.get("tt_session")?.value;
  const secret = getAuthSecret();
  const session = token && secret ? await verifySession(token, secret) : null;

  const isPublicApi =
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/me" ||
    pathname === "/api/auth/register";

  if (isPublicApi) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(appAbsoluteUrl(request, "/me"));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = appAbsoluteUrl(request, "/login");
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  const role = sessionRole(session);

  if (isMemberRestrictedRole(role)) {
    if (pathname.startsWith("/board")) {
      return NextResponse.redirect(appAbsoluteUrl(request, "/me"));
    }
    if (pathname.startsWith("/api/board/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/api/time-analytics/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/api/team/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!canAccessAgencyRoutes(role)) {
    if (pathname.startsWith("/api/agency") || pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/api/time-analytics/team-week")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (pathname.startsWith("/agency") || pathname.startsWith("/sales") || pathname.startsWith("/admin")) {
      return NextResponse.redirect(appAbsoluteUrl(request, "/me"));
    }
    if (pathname.startsWith("/board/team-load")) {
      return NextResponse.redirect(appAbsoluteUrl(request, "/me"));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
