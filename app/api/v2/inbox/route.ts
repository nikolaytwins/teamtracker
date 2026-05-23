import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { listInboxTasks, setInboxBucket } from "@/lib/v2/inbox/inbox-repo";
import type { V2InboxBucket } from "@/lib/v2/types";

export async function GET() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const buckets = await listInboxTasks(auth.ctx);
  return NextResponse.json({ buckets });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const taskId = typeof body.taskId === "string" ? body.taskId : "";
  const bucket = body.bucket as V2InboxBucket | null;
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
  await setInboxBucket(auth.ctx, taskId, bucket);
  return NextResponse.json({ ok: true });
}
