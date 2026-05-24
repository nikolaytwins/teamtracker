import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { getUserById, syncUsersFromEnv, updateUserBasicProfile } from "@/lib/tt-auth-db";
import { setTtSessionCookieFromUser } from "@/lib/tt-session-cookie";
import { uploadUserAvatarToSupabaseStorage } from "@/lib/supabase-avatar-upload";

function userJson(row: NonNullable<ReturnType<typeof getUserById>>) {
  return {
    id: row.id,
    login: row.login,
    name: row.display_name,
    title: row.job_title,
    avatarUrl: row.avatar_url,
    role: row.role,
  };
}

export async function POST(request: NextRequest) {
  try {
    syncUsersFromEnv();
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("avatar");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Выберите файл изображения" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await uploadUserAvatarToSupabaseStorage(session.sub, buffer, file.type || "image/jpeg");
    if (!upload.ok) return NextResponse.json({ error: upload.error }, { status: 400 });

    const saved = updateUserBasicProfile(session.sub, { avatar_url: upload.publicUrl });
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });

    const row = getUserById(session.sub);
    if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const res = NextResponse.json({ user: userJson(row), avatarUrl: upload.publicUrl });
    await setTtSessionCookieFromUser(res, row, request);
    return res;
  } catch (e) {
    console.error("POST /api/me/avatar", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    syncUsersFromEnv();
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const saved = updateUserBasicProfile(session.sub, { avatar_url: null });
    if (!saved.ok) return NextResponse.json({ error: saved.error }, { status: 400 });

    const row = getUserById(session.sub);
    if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const res = NextResponse.json({ user: userJson(row) });
    await setTtSessionCookieFromUser(res, row, request);
    return res;
  } catch (e) {
    console.error("DELETE /api/me/avatar", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
