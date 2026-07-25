import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";
import {
  WEEK_FOCUS_PLANS,
  weekMondayYmd,
  weekSundayYmd,
  formatWeekRangeShort,
} from "@/lib/v2/personal/week-focus-plan";

export type WeekFocusGoalRow = {
  id: string;
  title: string;
  completed_at: string | null;
  sort_order: number;
};

export type WeekFocusPayload = {
  id: string | null;
  week_start: string;
  week_end: string;
  label: string;
  result_title: string;
  goals: WeekFocusGoalRow[];
};

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

async function seedWeekFocusIfNeeded(ctx: V2SessionContext) {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const { count, error } = await sb
    .from("v2_personal_week_focus")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const now = nowIso();
  for (const plan of WEEK_FOCUS_PLANS) {
    const focusId = newV2Id();
    const { error: focusError } = await sb.from("v2_personal_week_focus").insert({
      id: focusId,
      user_id: userId,
      week_start: plan.from,
      result_title: plan.resultTitle,
      created_at: now,
      updated_at: now,
    });
    if (focusError) throw focusError;

    if (!plan.goals.length) continue;
    const { error: goalsError } = await sb.from("v2_personal_week_focus_goals").insert(
      plan.goals.map((goal, index) => ({
        id: newV2Id(),
        focus_id: focusId,
        user_id: userId,
        title: goal.title,
        completed_at: null,
        sort_order: index,
        created_at: now,
        updated_at: now,
      }))
    );
    if (goalsError) throw goalsError;
  }
}

async function ensureFocusForWeek(
  ctx: V2SessionContext,
  weekStart: string
): Promise<{ id: string; result_title: string }> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const { data, error } = await sb
    .from("v2_personal_week_focus")
    .select("id, result_title")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;
  if (data) {
    return { id: String(data.id), result_title: String(data.result_title) };
  }

  const now = nowIso();
  const id = newV2Id();
  const { error: insertError } = await sb.from("v2_personal_week_focus").insert({
    id,
    user_id: userId,
    week_start: weekStart,
    result_title: "Главный результат недели",
    created_at: now,
    updated_at: now,
  });
  if (insertError) throw insertError;
  return { id, result_title: "Главный результат недели" };
}

export async function loadWeekFocus(
  ctx: V2SessionContext,
  forDate: string
): Promise<WeekFocusPayload> {
  await seedWeekFocusIfNeeded(ctx);

  const weekStart = weekMondayYmd(forDate);
  const weekEnd = weekSundayYmd(weekStart);
  const sb = getV2Supabase();
  const userId = uid(ctx);

  const { data: focus, error } = await sb
    .from("v2_personal_week_focus")
    .select("id, result_title, week_start")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) throw error;

  if (!focus) {
    return {
      id: null,
      week_start: weekStart,
      week_end: weekEnd,
      label: formatWeekRangeShort(weekStart, weekEnd),
      result_title: "Главный результат недели",
      goals: [],
    };
  }

  const { data: goals, error: goalsError } = await sb
    .from("v2_personal_week_focus_goals")
    .select("id, title, completed_at, sort_order")
    .eq("focus_id", focus.id)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (goalsError) throw goalsError;

  return {
    id: String(focus.id),
    week_start: weekStart,
    week_end: weekEnd,
    label: formatWeekRangeShort(weekStart, weekEnd),
    result_title: String(focus.result_title),
    goals: (goals ?? []).map((g) => ({
      id: String(g.id),
      title: String(g.title),
      completed_at: g.completed_at ? String(g.completed_at) : null,
      sort_order: Number(g.sort_order) || 0,
    })),
  };
}

export async function updateWeekFocusTitle(
  ctx: V2SessionContext,
  weekStart: string,
  resultTitle: string
): Promise<WeekFocusPayload> {
  const title = resultTitle.trim() || "Главный результат недели";
  const focus = await ensureFocusForWeek(ctx, weekStart);
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_week_focus")
    .update({ result_title: title, updated_at: nowIso() })
    .eq("id", focus.id)
    .eq("user_id", uid(ctx));
  if (error) throw error;
  return loadWeekFocus(ctx, weekStart);
}

export async function addWeekFocusGoal(
  ctx: V2SessionContext,
  weekStart: string,
  title: string
): Promise<WeekFocusGoalRow> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("title required");
  const focus = await ensureFocusForWeek(ctx, weekStart);
  const sb = getV2Supabase();
  const { data: maxRow } = await sb
    .from("v2_personal_week_focus_goals")
    .select("sort_order")
    .eq("focus_id", focus.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const now = nowIso();
  const row = {
    id: newV2Id(),
    focus_id: focus.id,
    user_id: uid(ctx),
    title: trimmed,
    completed_at: null,
    sort_order: (Number(maxRow?.sort_order) || 0) + 1,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_week_focus_goals").insert(row);
  if (error) throw error;
  return {
    id: row.id,
    title: row.title,
    completed_at: null,
    sort_order: row.sort_order,
  };
}

export async function updateWeekFocusGoal(
  ctx: V2SessionContext,
  goalId: string,
  patch: { title?: string; completed?: boolean }
): Promise<WeekFocusGoalRow | null> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const { data: existing, error: findError } = await sb
    .from("v2_personal_week_focus_goals")
    .select("id, title, completed_at, sort_order")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) return null;

  const safe: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error("title required");
    safe.title = title;
  }
  if (patch.completed !== undefined) {
    safe.completed_at = patch.completed ? nowIso() : null;
  }

  const { error } = await sb
    .from("v2_personal_week_focus_goals")
    .update(safe)
    .eq("id", goalId)
    .eq("user_id", userId);
  if (error) throw error;

  return {
    id: String(existing.id),
    title: typeof safe.title === "string" ? safe.title : String(existing.title),
    completed_at:
      patch.completed === undefined
        ? existing.completed_at
          ? String(existing.completed_at)
          : null
        : patch.completed
          ? String(safe.completed_at)
          : null,
    sort_order: Number(existing.sort_order) || 0,
  };
}

export async function deleteWeekFocusGoal(ctx: V2SessionContext, goalId: string): Promise<boolean> {
  const sb = getV2Supabase();
  const { error, count } = await sb
    .from("v2_personal_week_focus_goals")
    .delete({ count: "exact" })
    .eq("id", goalId)
    .eq("user_id", uid(ctx));
  if (error) throw error;
  return (count ?? 0) > 0;
}
