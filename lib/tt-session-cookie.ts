import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { sessionCookieSecure } from "@/lib/session-cookie";
import { getAuthSecret, signSession } from "@/lib/session-token";
import type { TtUserRow } from "@/lib/tt-auth-db";

const COOKIE = "tt_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

/** Перевыпустить JWT в cookie после смены имени/должности (payload синхронизируется с БД). */
export async function setTtSessionCookieFromUser(res: NextResponse, user: TtUserRow, request: NextRequest): Promise<void> {
  const secret = getAuthSecret();
  if (!secret) return;
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const token = await signSession(
    {
      sub: user.id,
      login: user.login,
      name: user.display_name,
      title: user.job_title,
      role: user.role,
      exp,
    },
    secret
  );
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    path: "/",
    maxAge: MAX_AGE_SEC,
    sameSite: "lax",
    secure: sessionCookieSecure(request),
  });
}
