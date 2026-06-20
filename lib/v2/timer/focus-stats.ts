import { getV2Supabase } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";
import { overlapSeconds, startOfLocalDay, endOfLocalDay } from "@/lib/v2/timer/session-duration";

/** Сумма секунд в фокусе за локальный день (пересечение сессий с календарным днём). */
export async function sumFocusSecondsForDay(
  ctx: V2SessionContext,
  day: Date = new Date()
): Promise<number> {
  const sb = getV2Supabase();
  const windowStart = startOfLocalDay(day);
  const windowEnd = endOfLocalDay(day);
  const now = new Date();

  const { data, error } = await sb
    .from("v2_time_sessions")
    .select("started_at, ended_at")
    .eq("workspace_id", ctx.workspaceId)
    .eq("user_id", ctx.userId)
    .lte("started_at", windowEnd.toISOString())
    .or(`ended_at.is.null,ended_at.gte.${windowStart.toISOString()}`);

  if (error) throw new Error(error.message);

  return (data ?? []).reduce(
    (sum, row) =>
      sum +
      overlapSeconds(
        row.started_at as string,
        row.ended_at as string | null,
        windowStart,
        windowEnd,
        now
      ),
    0
  );
}
