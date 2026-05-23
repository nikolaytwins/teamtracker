import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { postponeIncompleteToday } from "@/lib/v2/tasks/task-repo";

export async function POST() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const count = await postponeIncompleteToday(auth.ctx);
  return NextResponse.json({ count });
}
