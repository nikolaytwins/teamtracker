import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { ymdFromDate } from "@/lib/v2/personal/todo-date";
import { buildS2Seed } from "@/lib/v2/s2/seed";
import {
  S2_ACTIVE_BET_STATUSES,
  S2_MAX_ACTIVE_BETS,
  S2_SINGLE_FRONT,
  type S2BacklogItem,
  type S2Bet,
  type S2BetFront,
  type S2BetStatus,
  type S2Board,
  type S2Entity,
  type S2Prana,
  type S2Sprint,
} from "@/lib/v2/s2/types";
import type { V2SessionContext } from "@/lib/v2/types";

export class S2ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "S2ValidationError";
  }
}

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function asRecord(r: unknown): Record<string, unknown> {
  return (r ?? {}) as Record<string, unknown>;
}

function str(r: Record<string, unknown>, k: string, d = "") {
  const v = r[k];
  return v == null ? d : String(v);
}

function weekMonday(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return ymdFromDate(d);
}

function mapSprint(r: Record<string, unknown>): S2Sprint {
  const stagesRaw = r.stages;
  const stages = Array.isArray(stagesRaw) ? (stagesRaw as S2Sprint["stages"]) : [];
  return {
    id: str(r, "id"),
    title: str(r, "title"),
    start_date: str(r, "start_date").slice(0, 10),
    end_date: str(r, "end_date").slice(0, 10),
    next_review_date: r.next_review_date ? str(r, "next_review_date").slice(0, 10) : null,
    core_question: str(r, "core_question"),
    meta_principle: str(r, "meta_principle"),
    main_task: str(r, "main_task"),
    success_criterion: str(r, "success_criterion"),
    status: str(r, "status", "active") as S2Sprint["status"],
    stages,
  };
}

function mapBet(r: Record<string, unknown>): S2Bet {
  return {
    id: str(r, "id"),
    sprint_id: r.sprint_id ? str(r, "sprint_id") : null,
    engine_id: r.engine_id ? str(r, "engine_id") : null,
    title: str(r, "title"),
    hypothesis: str(r, "hypothesis"),
    why: str(r, "why"),
    minimal_test: str(r, "minimal_test"),
    sufficient_action: str(r, "sufficient_action"),
    success_signals: str(r, "success_signals"),
    fail_signals: str(r, "fail_signals"),
    threshold: str(r, "threshold"),
    next_action: str(r, "next_action"),
    front: (str(r, "front", "other") as S2BetFront) || "other",
    status: (str(r, "status", "testing") as S2BetStatus) || "testing",
    review_date: r.review_date ? str(r, "review_date").slice(0, 10) : null,
    sort_order: Number(r.sort_order) || 0,
  };
}

function mapPrana(r: Record<string, unknown>): S2Prana {
  return {
    id: str(r, "id"),
    week_start: str(r, "week_start").slice(0, 10),
    training_count: Number(r.training_count) || 0,
    walk: Boolean(r.walk),
    white_window: Boolean(r.white_window),
    social: Boolean(r.social),
    creative: Boolean(r.creative),
  };
}

async function seedIfNeeded(userId: string): Promise<void> {
  const sb = getV2Supabase();
  const { count, error } = await sb
    .from("v2_s2_sprints")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const seed = buildS2Seed(userId);
  const inserts: [string, unknown[]][] = [
    ["v2_s2_sprints", [seed.sprint]],
    ["v2_s2_goals", seed.goals],
    ["v2_s2_engines", seed.engines],
    ["v2_s2_bets", seed.bets],
    ["v2_s2_antipatterns", seed.antipatterns],
    ["v2_s2_rules", seed.rules],
    ["v2_s2_decisions", seed.decisions],
    ["v2_s2_constraints", seed.constraints],
    ["v2_s2_month_outcomes", seed.monthOutcomes],
  ];
  for (const [table, rows] of inserts) {
    const { error: insErr } = await sb.from(table).insert(rows);
    if (insErr) throw insErr;
  }
}

export async function loadS2Board(ctx: V2SessionContext): Promise<S2Board> {
  const userId = uid(ctx);
  await seedIfNeeded(userId);
  const sb = getV2Supabase();
  const monday = weekMonday();

  const [
    sprints,
    goals,
    engines,
    bets,
    rules,
    antipatterns,
    decisions,
    backlog,
    constraints,
    monthOutcomes,
    evidence,
    signals,
    pranaRes,
    reviews,
  ] = await Promise.all([
    sb.from("v2_s2_sprints").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
    sb.from("v2_s2_goals").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_s2_engines").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_s2_bets").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_s2_rules").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_s2_antipatterns").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_s2_decisions").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_s2_backlog").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    sb.from("v2_s2_constraints").select("*").eq("user_id", userId).order("sort_order"),
    sb.from("v2_s2_month_outcomes").select("*").eq("user_id", userId).order("year").order("month").order("sort_order"),
    sb.from("v2_s2_evidence").select("*").eq("user_id", userId).order("happened_on", { ascending: false }).limit(80),
    sb.from("v2_s2_signals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(80),
    sb.from("v2_s2_prana").select("*").eq("user_id", userId).eq("week_start", monday).maybeSingle(),
    sb.from("v2_s2_reviews").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(12),
  ]);

  for (const res of [sprints, goals, engines, bets, rules, antipatterns, decisions, backlog, constraints, monthOutcomes, evidence, signals, reviews]) {
    if (res.error) throw res.error;
  }
  if (pranaRes.error) throw pranaRes.error;

  const sprintRow = (sprints.data ?? []).find((s) => str(asRecord(s), "status") === "active") ?? (sprints.data ?? [])[0];

  return {
    sprint: sprintRow ? mapSprint(asRecord(sprintRow)) : null,
    goals: (goals.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        title: str(x, "title"),
        essence: str(x, "essence"),
        why_important: str(x, "why_important"),
        examples: str(x, "examples"),
        anti_distortion: str(x, "anti_distortion"),
        status: str(x, "status", "building") as S2Board["goals"][number]["status"],
        sort_order: Number(x.sort_order) || 0,
        spotlight: Boolean(x.spotlight),
      };
    }),
    engines: (engines.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        title: str(x, "title"),
        function_text: str(x, "function_text"),
        not_for: str(x, "not_for"),
        good_scenario: str(x, "good_scenario"),
        red_line: str(x, "red_line"),
        mode: str(x, "mode", "active") as S2Board["engines"][number]["mode"],
        metrics: str(x, "metrics"),
        spotlight_key: (x.spotlight_key ? str(x, "spotlight_key") : null) as S2Board["engines"][number]["spotlight_key"],
        sort_order: Number(x.sort_order) || 0,
      };
    }),
    bets: (bets.data ?? []).map((r) => mapBet(asRecord(r))),
    rules: (rules.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        trigger: str(x, "trigger"),
        old_pattern: str(x, "old_pattern"),
        instruction: str(x, "instruction"),
        why: str(x, "why"),
        examples: str(x, "examples"),
        antipattern_id: x.antipattern_id ? str(x, "antipattern_id") : null,
        sort_order: Number(x.sort_order) || 0,
      };
    }),
    antipatterns: (antipatterns.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        title: str(x, "title"),
        manifestation: str(x, "manifestation"),
        antidote: str(x, "antidote"),
        sort_order: Number(x.sort_order) || 0,
      };
    }),
    decisions: (decisions.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        question: str(x, "question"),
        status: str(x, "status", "need_data") as S2Board["decisions"][number]["status"],
        position: str(x, "position"),
        why: str(x, "why"),
        needed_data: str(x, "needed_data"),
        revisit_date: x.revisit_date ? str(x, "revisit_date").slice(0, 10) : null,
        sort_order: Number(x.sort_order) || 0,
      };
    }),
    backlog: (backlog.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        title: str(x, "title"),
        category: str(x, "category", "product") as S2BacklogItem["category"],
        why_interesting: str(x, "why_interesting"),
        source: str(x, "source"),
        activation_trigger: str(x, "activation_trigger"),
        created_at: str(x, "created_at"),
      };
    }),
    constraints: (constraints.data ?? []).map((r) => {
      const x = asRecord(r);
      return { id: str(x, "id"), title: str(x, "title"), sort_order: Number(x.sort_order) || 0 };
    }),
    monthOutcomes: (monthOutcomes.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        year: Number(x.year) || new Date().getFullYear(),
        month: Number(x.month) || new Date().getMonth() + 1,
        title: str(x, "title"),
        done: Boolean(x.done),
        sort_order: Number(x.sort_order) || 0,
      };
    }),
    evidence: (evidence.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        bet_id: x.bet_id ? str(x, "bet_id") : null,
        engine_id: x.engine_id ? str(x, "engine_id") : null,
        happened_on: str(x, "happened_on").slice(0, 10),
        type: str(x, "type", "neutral") as S2Board["evidence"][number]["type"],
        fact: str(x, "fact"),
        interpretation: str(x, "interpretation"),
        weight: str(x, "weight", "medium") as S2Board["evidence"][number]["weight"],
        next_action: str(x, "next_action"),
        created_at: str(x, "created_at"),
      };
    }),
    signals: (signals.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        type: str(x, "type", "returns") as S2Board["signals"][number]["type"],
        text: str(x, "text"),
        bet_id: x.bet_id ? str(x, "bet_id") : null,
        created_at: str(x, "created_at"),
      };
    }),
    prana: pranaRes.data ? mapPrana(asRecord(pranaRes.data)) : null,
    reviews: (reviews.data ?? []).map((r) => {
      const x = asRecord(r);
      return {
        id: str(x, "id"),
        sprint_id: x.sprint_id ? str(x, "sprint_id") : null,
        summary: str(x, "summary"),
        next_architecture: str(x, "next_architecture"),
        created_at: str(x, "created_at"),
      };
    }),
  };
}

const TABLES: Record<Exclude<S2Entity, "sprint" | "prana">, string> = {
  goal: "v2_s2_goals",
  engine: "v2_s2_engines",
  bet: "v2_s2_bets",
  rule: "v2_s2_rules",
  antipattern: "v2_s2_antipatterns",
  decision: "v2_s2_decisions",
  backlog: "v2_s2_backlog",
  constraint: "v2_s2_constraints",
  month_outcome: "v2_s2_month_outcomes",
  evidence: "v2_s2_evidence",
  signal: "v2_s2_signals",
  review: "v2_s2_reviews",
};

function isActiveStatus(status: string) {
  return S2_ACTIVE_BET_STATUSES.includes(status as S2BetStatus);
}

async function checkBetLimits(
  userId: string,
  next: { status?: string; front?: string; id?: string },
  force: boolean
): Promise<string | null> {
  if (next.status && !isActiveStatus(next.status)) return null;
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_s2_bets").select("id, status, front").eq("user_id", userId);
  if (error) throw error;
  const others = (data ?? []).filter((r) => str(asRecord(r), "id") !== next.id);
  const active = others.filter((r) => isActiveStatus(str(asRecord(r), "status")));
  const status = next.status ?? "testing";
  const wouldActive = isActiveStatus(status);
  const count = active.length + (wouldActive ? 1 : 0);
  if (count > S2_MAX_ACTIVE_BETS) {
    const msg = `Уже ${active.length} активных ставок (лимит ${S2_MAX_ACTIVE_BETS}). Что эта ставка заменяет?`;
    if (!force) throw new S2ValidationError(msg);
    return msg;
  }
  const front = (next.front ?? "other") as S2BetFront;
  if (wouldActive && S2_SINGLE_FRONT.includes(front)) {
    const clash = active.find((r) => str(asRecord(r), "front") === front);
    if (clash) {
      const msg = `На фронте уже есть активная ставка. Что новый Bet заменяет?`;
      if (!force) throw new S2ValidationError(msg);
      return msg;
    }
  }
  return null;
}

export async function mutateS2(
  ctx: V2SessionContext,
  input: { entity: S2Entity; action: "create" | "update" | "delete"; id?: string; data?: Record<string, unknown>; force?: boolean }
): Promise<{ warning?: string | null }> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const now = nowIso();
  const { entity, action, id, data = {}, force } = input;

  if (entity === "sprint") {
    if (action === "update" && id) {
      const patch: Record<string, unknown> = { updated_at: now };
      for (const k of ["title", "start_date", "end_date", "next_review_date", "core_question", "meta_principle", "main_task", "success_criterion", "status"]) {
        if (data[k] !== undefined) patch[k] = data[k];
      }
      if (data.stages !== undefined) patch.stages = data.stages;
      const { error } = await sb.from("v2_s2_sprints").update(patch).eq("id", id).eq("user_id", userId);
      if (error) throw error;
    }
    return {};
  }

  if (entity === "prana") {
    const monday = typeof data.week_start === "string" ? data.week_start : weekMonday();
    const row = {
      id: typeof data.id === "string" ? data.id : newV2Id(),
      user_id: userId,
      week_start: monday,
      training_count: Number(data.training_count) || 0,
      walk: Boolean(data.walk),
      white_window: Boolean(data.white_window),
      social: Boolean(data.social),
      creative: Boolean(data.creative),
      updated_at: now,
    };
    const { error } = await sb.from("v2_s2_prana").upsert(row, { onConflict: "user_id,week_start" });
    if (error) throw error;
    return {};
  }

  const table = TABLES[entity as keyof typeof TABLES];
  if (!table) throw new S2ValidationError("unknown entity");

  if (action === "delete") {
    if (!id) throw new S2ValidationError("id required");
    const { error } = await sb.from(table).delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
    return {};
  }

  let warning: string | null = null;
  if (entity === "bet" && (action === "create" || action === "update")) {
    warning = await checkBetLimits(
      userId,
      {
        id,
        status: typeof data.status === "string" ? data.status : undefined,
        front: typeof data.front === "string" ? data.front : undefined,
      },
      Boolean(force)
    );
  }

  if (action === "create") {
    const row: Record<string, unknown> = {
      ...data,
      id: newV2Id(),
      user_id: userId,
      created_at: now,
      updated_at: now,
    };
    if (entity === "month_outcome") {
      const d = new Date();
      if (row.year == null) row.year = d.getFullYear();
      if (row.month == null) row.month = d.getMonth() + 1;
    }
    if (entity === "evidence" && !row.happened_on) row.happened_on = ymdFromDate(new Date());
    if (entity === "signal" && !row.type) row.type = "returns";
    const { error } = await sb.from(table).insert(row);
    if (error) throw error;
    return { warning };
  }

  if (action === "update") {
    if (!id) throw new S2ValidationError("id required");
    const patch: Record<string, unknown> = { ...data, updated_at: now };
    delete patch.id;
    delete patch.user_id;
    delete patch.created_at;
    const { error } = await sb.from(table).update(patch).eq("id", id).eq("user_id", userId);
    if (error) throw error;
    return { warning };
  }

  throw new S2ValidationError("unknown action");
}

export function s2WeekMonday() {
  return weekMonday();
}
