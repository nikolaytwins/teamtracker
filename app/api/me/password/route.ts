import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { syncUsersFromEnv, updateUserPasswordSelf } from "@/lib/tt-auth-db";

export async function POST(request: NextRequest) {
  try {
    syncUsersFromEnv();
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Укажите текущий и новый пароль" }, { status: 400 });
    }
    const r = updateUserPasswordSelf(session.sub, currentPassword, newPassword);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/me/password", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
