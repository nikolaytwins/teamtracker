import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { updateUserAvatar } from "@/lib/tt-auth-db";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : null;
    if (avatarUrl != null && avatarUrl.length > 2_000_000) {
      return NextResponse.json({ error: "Аватар слишком большой" }, { status: 400 });
    }
    const ok = updateUserAvatar(session.sub, avatarUrl);
    if (!ok) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/me/profile", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
