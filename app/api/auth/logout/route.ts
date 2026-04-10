import { NextRequest, NextResponse } from "next/server";
import { sessionCookieSecure } from "@/lib/session-cookie";

const COOKIE = "tt_session";

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const secure = sessionCookieSecure(request);
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, secure, sameSite: "lax" });
  return res;
}
