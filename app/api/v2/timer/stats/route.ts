import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { getActiveSession } from "@/lib/v2/timer/timer-service";
import { sumFocusSecondsForDay } from "@/lib/v2/timer/focus-stats";

export async function GET() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const [focusSecondsToday, active] = await Promise.all([
    sumFocusSecondsForDay(auth.ctx),
    getActiveSession(auth.ctx),
  ]);

  return NextResponse.json({
    focusSecondsToday,
    activeElapsedSeconds: active?.elapsedSeconds ?? 0,
    hasActiveTimer: !!active,
  });
}
