import { NextRequest, NextResponse } from "next/server";
import { sessionCookieSecure } from "@/lib/session-cookie";
import { isSelfRegistrationEnabled } from "@/lib/self-register";
import { signSession, getAuthSecret } from "@/lib/session-token";
import { registerSelfServeMember } from "@/lib/tt-auth-db";

const COOKIE = "tt_session";
const MAX_AGE = 60 * 60 * 24 * 14;

export async function GET() {
  return NextResponse.json({ enabled: isSelfRegistrationEnabled() });
}

export async function POST(request: NextRequest) {
  try {
    if (!isSelfRegistrationEnabled()) {
      return NextResponse.json({ error: "Регистрация отключена" }, { status: 403 });
    }
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
    const body = await request.json();
    const login = typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const display_name = typeof body.display_name === "string" ? body.display_name.trim() : "";
    const job_title = typeof body.job_title === "string" ? body.job_title.trim() : "";
    if (!login || !password || !display_name) {
      return NextResponse.json({ error: "Логин, пароль и имя обязательны" }, { status: 400 });
    }
    const created = registerSelfServeMember({
      login,
      password,
      display_name,
      job_title: job_title || undefined,
    });
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: 400 });
    }
    const user = created.user;
    const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
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
    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        login: user.login,
        name: user.display_name,
        title: user.job_title,
        avatarUrl: user.avatar_url,
        role: user.role,
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
    console.error("POST /api/auth/register", e);
    return NextResponse.json({ error: "Ошибка регистрации" }, { status: 500 });
  }
}
