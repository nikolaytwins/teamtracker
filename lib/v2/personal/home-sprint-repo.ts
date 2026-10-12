import { getV2Supabase, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";

export type SprintChecks = Record<string, boolean | number>;

const KEY = /^[a-z0-9]{1,12}$/;

export function sanitizeSprintChecks(raw: unknown): SprintChecks {
  if (!raw || typeof raw !== "object") return {};
  const out: SprintChecks = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!KEY.test(key)) continue;
    if (typeof value === "boolean") out[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = Math.max(0, Math.min(99, Math.round(value)));
  }
  return out;
}

export async function loadHomeSprintChecks(ctx: V2SessionContext): Promise<SprintChecks> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_home_sprint")
    .select("checks")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (error) throw error;
  return sanitizeSprintChecks(data?.checks);
}

export async function saveHomeSprintChecks(ctx: V2SessionContext, checks: SprintChecks): Promise<SprintChecks> {
  const clean = sanitizeSprintChecks(checks);
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_home_sprint").upsert({
    user_id: ctx.userId,
    checks: clean,
    updated_at: nowIso(),
  });
  if (error) throw error;
  return clean;
}
