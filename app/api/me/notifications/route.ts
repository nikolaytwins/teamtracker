import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { normalizeTtUserRole } from "@/lib/roles";
import {
  countUnreadForUser,
  ensureApprovalStaleNotifications,
  ensureTeamWeekLoadNotifications,
  listNotificationsForUser,
  markNotificationsRead,
} from "@/lib/tt-notifications";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (normalizeTtUserRole(session.role) === "admin") {
      ensureApprovalStaleNotifications();
      ensureTeamWeekLoadNotifications();
    }
    const items = listNotificationsForUser(session.sub, 40);
    const unreadCount = countUnreadForUser(session.sub);
    return NextResponse.json({ items, unreadCount });
  } catch (e) {
    console.error("GET /api/me/notifications", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    const marked = markNotificationsRead(session.sub, ids);
    return NextResponse.json({ ok: true, marked });
  } catch (e) {
    console.error("PATCH /api/me/notifications", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
