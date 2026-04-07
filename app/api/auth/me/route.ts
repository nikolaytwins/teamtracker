import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { getUserById } from "@/lib/tt-auth-db";
import { syncUsersFromEnv } from "@/lib/tt-auth-db";

export async function GET() {
  try {
    syncUsersFromEnv();
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const row = getUserById(session.sub);
    return NextResponse.json({
      user: row
        ? {
            id: row.id,
            login: row.login,
            name: row.display_name,
            title: row.job_title,
            avatarUrl: row.avatar_url,
          }
        : {
            id: session.sub,
            login: session.login,
            name: session.name,
            title: session.title,
            avatarUrl: null as string | null,
          },
    });
  } catch (e) {
    console.error("GET /api/auth/me", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
