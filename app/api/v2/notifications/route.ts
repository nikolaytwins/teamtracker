import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/v2/notifications/notification-repo";

export async function GET() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(auth.ctx),
    countUnreadNotifications(auth.ctx),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if (body.all === true) {
      await markAllNotificationsRead(auth.ctx);
      return NextResponse.json({ ok: true });
    }
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await markNotificationRead(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
