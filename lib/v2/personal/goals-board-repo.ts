import { getV2Supabase, nowIso } from "@/lib/v2/db/client";
import { sanitizeGoalsBoard, type GoalsBoard } from "@/lib/v2/personal/goals-board";
import type { V2SessionContext } from "@/lib/v2/types";

function missingTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const msg = String(error.message ?? "");
  return error.code === "42P01" || error.code === "PGRST205" || /v2_personal_goals_board/i.test(msg);
}

export async function loadGoalsBoard(ctx: V2SessionContext): Promise<{ board: GoalsBoard | null; persisted: boolean }> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_goals_board")
    .select("payload")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) {
    if (missingTable(error)) return { board: null, persisted: false };
    throw error;
  }
  if (!data?.payload) return { board: null, persisted: true };
  return { board: sanitizeGoalsBoard(data.payload), persisted: true };
}

export async function saveGoalsBoard(
  ctx: V2SessionContext,
  input: unknown
): Promise<{ board: GoalsBoard; persisted: boolean }> {
  const board = sanitizeGoalsBoard(input);
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_goals_board").upsert(
    {
      user_id: ctx.userId,
      payload: board,
      updated_at: nowIso(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    if (missingTable(error)) return { board, persisted: false };
    throw error;
  }
  return { board, persisted: true };
}
