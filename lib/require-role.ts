import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { canAccessAgencyRoutes, sessionRole, type TtUserRole } from "@/lib/roles";
import type { SessionPayload } from "@/lib/session-token";
import { getUserById } from "@/lib/tt-auth-db";

export async function requireSession(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const session = await getServerSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}

export async function requireSessionRole(): Promise<
  { ok: true; session: SessionPayload; role: TtUserRole } | { ok: false; response: NextResponse }
> {
  const r = await requireSession();
  if (!r.ok) return r;
  return { ok: true, session: r.session, role: effectiveUserRole(r.session) };
}

/** Админ по данным из БД (актуальная роль), с запасным вариантом по JWT. */
export function effectiveUserRole(session: SessionPayload): TtUserRole {
  const row = getUserById(session.sub);
  return row?.role ?? sessionRole(session);
}

export async function requireAgencyAccess(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const r = await requireSession();
  if (!r.ok) return r;
  if (!canAccessAgencyRoutes(effectiveUserRole(r.session))) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, session: r.session };
}

export function isSessionAgencyAdmin(session: SessionPayload): boolean {
  return canAccessAgencyRoutes(sessionRole(session));
}

export function roleFromSession(session: SessionPayload): TtUserRole {
  return sessionRole(session);
}
