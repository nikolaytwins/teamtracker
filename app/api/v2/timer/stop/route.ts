import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { stopActiveTimer } from "@/lib/v2/timer/timer-service";

export async function POST() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const session = await stopActiveTimer(auth.ctx);
    return NextResponse.json({ session });
  } catch (e) {
    console.error("POST /api/v2/timer/stop", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
