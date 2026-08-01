import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { DEFAULT_STRATEGY_PINS, type StrategyPinRow } from "@/lib/v2/strategy/types";
import type { V2SessionContext } from "@/lib/v2/types";

function mapPin(r: Record<string, unknown>): StrategyPinRow {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    month_label: String(r.month_label),
    title: String(r.title),
    sort_order: Number(r.sort_order) || 0,
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

async function seedPinsIfNeeded(userId: string): Promise<void> {
  const sb = getV2Supabase();
  const { count, error } = await sb
    .from("v2_strategy_pins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const now = nowIso();
  const rows = DEFAULT_STRATEGY_PINS.map((pin, index) => ({
    id: newV2Id(),
    user_id: userId,
    month_label: pin.month_label,
    title: pin.title,
    sort_order: index,
    created_at: now,
    updated_at: now,
  }));
  const { error: insErr } = await sb.from("v2_strategy_pins").insert(rows);
  if (insErr) throw insErr;
}

export async function listStrategyPins(ctx: V2SessionContext): Promise<StrategyPinRow[]> {
  await seedPinsIfNeeded(ctx.userId);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_strategy_pins")
    .select("*")
    .eq("user_id", ctx.userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => mapPin(r as Record<string, unknown>));
}

export async function createStrategyPin(
  ctx: V2SessionContext,
  input: { month_label: string; title: string }
): Promise<StrategyPinRow> {
  const month = input.month_label.trim();
  const title = input.title.trim();
  if (!month || !title) throw new Error("month_label and title required");

  const sb = getV2Supabase();
  const { data: maxRow } = await sb
    .from("v2_strategy_pins")
    .select("sort_order")
    .eq("user_id", ctx.userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: ctx.userId,
    month_label: month,
    title,
    sort_order: (Number(maxRow?.sort_order) || 0) + 1,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_strategy_pins").insert(row);
  if (error) throw error;
  return mapPin(row);
}

export async function deleteStrategyPin(ctx: V2SessionContext, id: string): Promise<boolean> {
  const sb = getV2Supabase();
  const { error, count } = await sb
    .from("v2_strategy_pins")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", ctx.userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
