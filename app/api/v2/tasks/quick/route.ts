import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { parseQuickTaskInput } from "@/lib/v2/nlp/parse-task";
import { createTask } from "@/lib/v2/tasks/task-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const raw = typeof body.text === "string" ? body.text.trim() : "";
    if (!raw) return NextResponse.json({ error: "text required" }, { status: 400 });

    const parsed = parseQuickTaskInput(raw);
    const toInbox = body.inbox === true || !parsed.deadlineAt;

    const task = await createTask(auth.ctx, {
      title: parsed.title,
      scope: body.scope === "personal" ? "personal" : "team",
      assigneeUserId: auth.ctx.userId,
      deadlineAt: toInbox ? null : parsed.deadlineAt,
      inboxBucket: toInbox ? "someday" : null,
      projectId: typeof body.projectId === "string" ? body.projectId : null,
    });

    return NextResponse.json({ task, parsed });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
