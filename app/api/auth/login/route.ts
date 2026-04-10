import { NextRequest, NextResponse } from "next/server";
import { sessionCookieSecure } from "@/lib/session-cookie";
import { syncUsersFromEnv, getUserByLogin, verifyPassword } from "@/lib/tt-auth-db";
import { signSession, getAuthSecret } from "@/lib/session-token";

const COOKIE = "tt_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export async function POST(request: NextRequest) {
  try {
    const secret = getAuthSecret();
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.TEAM_TRACKER_AUTH_SECRET?.trim() || secret === "dev-insecure-tt-session-secret")
    ) {
      return NextResponse.json(
        { error: "Задайте TEAM_TRACKER_AUTH_SECRET в окружении" },
        { status: 500 }
      );
    }
    syncUsersFromEnv();
    const body = await request.json();
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!login || !password) {
      return NextResponse.json({ error: "Логин и пароль обязательны" }, { status: 400 });
    }
    const user = getUserByLogin(login);
    if (!user || !verifyPassword(password, user)) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
    const token = await signSession(
      {
        sub: user.id,
        login: user.login,
        name: user.display_name,
        title: user.job_title,
        exp,
      },
      secret
    );
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        login: user.login,
        name: user.display_name,
        title: user.job_title,
        avatarUrl: user.avatar_url,
      },
    });
    const secure = sessionCookieSecure(request);
    res.cookies.set(COOKIE, token, {
      httpOnly: true,
      path: "/",
      maxAge: MAX_AGE,
      sameSite: "lax",
      secure,
    });
    return res;
  } catch (e) {
    console.error("POST /api/auth/login", e);
    return NextResponse.json({ error: "Ошибка входа" }, { status: 500 });
  }
}
