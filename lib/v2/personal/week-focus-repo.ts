import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";
import {
  WEEK_FOCUS_PLANS,
  weekMondayYmd,
  weekSundayYmd,
  formatWeekRangeShort,
} from "@/lib/v2/personal/week-focus-plan";

/** high — обязательно (красный), medium — желательно (оранжевый), low — можно не делать (серый). */
export type WeekFocusPriority = "high" | "medium" | "low";

export type WeekFocusGoalRow = {
  id: string;
  title: string;
  priority: WeekFocusPriority;
  completed_at: string | null;
  sort_order: number;
  /** 0 — основной, 1 — дополнительный */
  slot: number | null;
  note: string;
};

const PRIORITY_RANK: Record<WeekFocusPriority, number> = { high: 0, medium: 1, low: 2 };

export function isWeekFocusPriority(value: unknown): value is WeekFocusPriority {
  return value === "high" || value === "medium" || value === "low";
}

function normPriority(value: unknown): WeekFocusPriority {
  return isWeekFocusPriority(value) ? value : "medium";
}

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
    .select("id, title, priority, completed_at, sort_order, slot, note")
    .eq("focus_id", focus.id)
    .eq("user_id", userId)
    .order("slot", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (goalsError) throw goalsError;

  const mapped: WeekFocusGoalRow[] = (goals ?? []).map((g) => ({
    id: String(g.id),
    title: String(g.title),
    priority: normPriority(g.priority),
    completed_at: g.completed_at ? String(g.completed_at) : null,
    sort_order: Number(g.sort_order) || 0,
    slot: g.slot == null ? null : Number(g.slot),
    note: g.note ? String(g.note) : "",
  }));
  mapped.sort((a, b) => {
    const slotA = a.slot ?? 99;
    const slotB = b.slot ?? 99;
    if (slotA !== slotB) return slotA - slotB;
    const done = Number(Boolean(a.completed_at)) - Number(Boolean(b.completed_at));
    if (done !== 0) return done;
    return a.sort_order - b.sort_order;
  });

  const slotted = mapped.filter((g) => g.slot === 0 || g.slot === 1);

  return {
    id: String(focus.id),
    week_start: weekStart,
    week_end: weekEnd,
    label: formatWeekRangeShort(weekStart, weekEnd),
    result_title: String(focus.result_title),
    goals: slotted,
  };
}

export async function upsertWeekFocusSlot(
  ctx: V2SessionContext,
  weekStart: string,
  slot: 0 | 1,
  input: { title: string; note?: string; priority?: WeekFocusPriority }
): Promise<WeekFocusGoalRow> {
  const trimmed = input.title.trim();
  if (!trimmed) throw new Error("title required");
  const focus = await ensureFocusForWeek(ctx, weekStart);
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const now = nowIso();

  const { data: existing } = await sb
    .from("v2_personal_week_focus_goals")
    .select("id")
    .eq("focus_id", focus.id)
    .eq("user_id", userId)
    .eq("slot", slot)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from("v2_personal_week_focus_goals")
      .update({
        title: trimmed,
        note: input.note?.trim() ?? "",
        priority: normPriority(input.priority ?? (slot === 0 ? "high" : "medium")),
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("user_id", userId);
    if (error) throw error;
    const loaded = await loadWeekFocus(ctx, weekStart);
    const goal = loaded.goals.find((g) => g.slot === slot);
    if (!goal) throw new Error("goal not found after update");
    return goal;
  }

  const row = {
    id: newV2Id(),
    focus_id: focus.id,
    user_id: userId,
    title: trimmed,
    note: input.note?.trim() ?? "",
    priority: normPriority(input.priority ?? (slot === 0 ? "high" : "medium")),
    completed_at: null,
    sort_order: slot,
    slot,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_week_focus_goals").insert(row);
  if (error) throw error;
  return {
    id: row.id,
    title: row.title,
    priority: row.priority,
    completed_at: null,
    sort_order: row.sort_order,
    slot,
    note: row.note,
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
  title: string,
  priority?: WeekFocusPriority,
  slot?: 0 | 1
): Promise<WeekFocusGoalRow> {
  if (slot === 0 || slot === 1) {
    return upsertWeekFocusSlot(ctx, weekStart, slot, { title, priority });
  }
  const loaded = await loadWeekFocus(ctx, weekStart);
  const used = new Set(loaded.goals.map((g) => g.slot).filter((s): s is number => s != null));
  const nextSlot: 0 | 1 = !used.has(0) ? 0 : !used.has(1) ? 1 : (null as never);
  if (nextSlot === (null as never)) throw new Error("week focus slots full");
  return upsertWeekFocusSlot(ctx, weekStart, nextSlot, { title, priority });
}

export async function updateWeekFocusGoal(
  ctx: V2SessionContext,
  goalId: string,
  patch: { title?: string; completed?: boolean; priority?: WeekFocusPriority; note?: string }
): Promise<WeekFocusGoalRow | null> {
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const { data: existing, error: findError } = await sb
    .from("v2_personal_week_focus_goals")
    .select("id, title, priority, completed_at, sort_order, slot, note")
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
  if (patch.priority !== undefined) {
    safe.priority = normPriority(patch.priority);
  }
  if (patch.note !== undefined) {
    safe.note = patch.note.trim();
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
    priority: normPriority(safe.priority ?? existing.priority),
    completed_at:
      patch.completed === undefined
        ? existing.completed_at
          ? String(existing.completed_at)
          : null
        : patch.completed
          ? String(safe.completed_at)
          : null,
    sort_order: Number(existing.sort_order) || 0,
    slot: existing.slot == null ? null : Number(existing.slot),
    note: typeof safe.note === "string" ? safe.note : existing.note ? String(existing.note) : "",
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
