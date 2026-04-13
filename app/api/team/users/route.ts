import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-role";
import { listUsersPublic } from "@/lib/tt-auth-db";

/** Список учёток для назначения на подзадачи (без паролей). Любой авторизованный пользователь. */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;
  const rows = listUsersPublic();
  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      displayName: u.display_name,
      login: u.login,
      jobTitle: u.job_title,
      avatarUrl: u.avatar_url,
      role: u.role,
    })),
  });
}
