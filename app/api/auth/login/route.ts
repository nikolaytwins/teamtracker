import { NextRequest, NextResponse } from "next/server";
import { isSupabasePasswordLoginConfigured } from "@/lib/auth-supabase-config";
import { sessionCookieSecure } from "@/lib/session-cookie";
import { signSession, getAuthSecret } from "@/lib/session-token";
import { signInWithSupabaseEmailPassword } from "@/lib/supabase-password-auth";
import {
  syncUsersFromEnv,
  getUserByLogin,
  verifyPassword,
  getAuthEmailForUser,
  linkTtUserToSupabaseAuthId,
} from "@/lib/tt-auth-db";

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
    if (!user) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const emailForSupabase = getAuthEmailForUser(user);
    /** Учётки member после саморегистрации ходят только по локальному паролю (без пользователя в Supabase Auth). */
    const useSupabase =
      isSupabasePasswordLoginConfigured() &&
      emailForSupabase != null &&
      user.role !== "member";

    if (useSupabase) {
      const supa = await signInWithSupabaseEmailPassword(emailForSupabase, password);
      if (!supa.ok) {
        return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
      }
      const linked = linkTtUserToSupabaseAuthId(user.id, supa.supabaseUserId);
      if (!linked.ok) {
        console.error("POST /api/auth/login Supabase link", linked.error);
        return NextResponse.json({ error: "Внутренняя ошибка входа" }, { status: 500 });
      }
    } else if (!verifyPassword(password, user)) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
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
    console.error("POST /api/auth/login", e);
    return NextResponse.json({ error: "Ошибка входа" }, { status: 500 });
  }
}
