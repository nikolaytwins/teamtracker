import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { canAccessAgencyRoutes, isMemberRestrictedRole, sessionRole } from "@/lib/roles";
import { getAuthSecret, verifySession } from "@/lib/session-token";

function normalizePath(pathname: string, basePath: string): string {
  if (basePath && pathname.startsWith(basePath)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}

export async function middleware(request: NextRequest) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const pathname = normalizePath(request.nextUrl.pathname, basePath);

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
      return NextResponse.redirect(new URL((basePath || "") + "/me", request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL((basePath || "") + "/login", request.url);
    login.searchParams.set("redirect", pathname);
    return NextResponse.redirect(login);
  }

  const role = sessionRole(session);

  if (isMemberRestrictedRole(role)) {
    if (pathname.startsWith("/board")) {
      return NextResponse.redirect(new URL((basePath || "") + "/me", request.url));
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
      return NextResponse.redirect(new URL((basePath || "") + "/me", request.url));
    }
    if (pathname.startsWith("/board/team-load")) {
      return NextResponse.redirect(new URL((basePath || "") + "/me", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
