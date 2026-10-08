import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import {
  HYPOTHESIS_SEEDS,
  isHypothesisOutcome,
  isHypothesisPriority,
  isHypothesisStatus,
  type Hypothesis,
  type HypothesisNote,
  type HypothesisOutcome,
  type HypothesisPriority,
  type HypothesisStatus,
  type HypothesisWithNotes,
} from "@/lib/v2/personal/hypotheses-meta";
import type { V2SessionContext } from "@/lib/v2/types";

export class PersonalHypothesesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalHypothesesValidationError";
  }
}

export class PersonalHypothesesNotFoundError extends Error {
  constructor() {
    super("Гипотеза не найдена");
    this.name = "PersonalHypothesesNotFoundError";
  }
}

export type HypothesesBoard = {
  hypotheses: HypothesisWithNotes[];
};

export type HypothesisReorderItem = {
  id: string;
  priority: HypothesisPriority;
  sort_order: number;
};

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function mapHypothesis(row: Record<string, unknown>): Hypothesis {
  const priority = String(row.priority || "medium");
  const status = String(row.status || "testing");
  return {
    id: String(row.id),
    direction: String(row.direction || ""),
    title: String(row.title || ""),
    check_text: String(row.check_text || ""),
    success_text: String(row.success_text || ""),
    priority: isHypothesisPriority(priority) ? priority : "medium",
    status: isHypothesisStatus(status) ? status : "testing",
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapNote(row: Record<string, unknown>): HypothesisNote {
  const outcome = String(row.outcome || "note");
  const happened = String(row.happened_on || "").slice(0, 10);
  return {
    id: String(row.id),
    hypothesis_id: String(row.hypothesis_id),
    body: String(row.body || ""),
    outcome: isHypothesisOutcome(outcome) ? outcome : "note",
    happened_on: happened,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function listHypothesisRows(userId: string): Promise<Hypothesis[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypotheses")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapHypothesis);
}

async function listNoteRows(userId: string): Promise<HypothesisNote[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypothesis_notes")
    .select("*")
    .eq("user_id", userId)
    .order("happened_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapNote);
}

function attachNotes(hypotheses: Hypothesis[], notes: HypothesisNote[]): HypothesisWithNotes[] {
  const byHyp = new Map<string, HypothesisNote[]>();
  for (const note of notes) {
    const list = byHyp.get(note.hypothesis_id) ?? [];
    list.push(note);
    byHyp.set(note.hypothesis_id, list);
  }
  return hypotheses.map((hypothesis) => ({
    ...hypothesis,
    notes: byHyp.get(hypothesis.id) ?? [],
  }));
}

async function seedIfEmpty(userId: string) {
  const sb = getV2Supabase();
  const now = nowIso();
  const { error: lockError } = await sb.from("v2_personal_hypothesis_settings").insert({
    user_id: userId,
    seeded_at: now,
  });
  if (lockError) {
    const code = "code" in lockError ? String(lockError.code) : "";
    if (code === "23505") return;
    throw lockError;
  }
  const existing = await listHypothesisRows(userId);
  if (existing.length > 0) return;
  const rows = HYPOTHESIS_SEEDS.map((seed, index) => ({
    id: newV2Id(),
    user_id: userId,
    direction: seed.direction,
    title: seed.title,
    check_text: seed.check_text,
    success_text: seed.success_text,
    priority: seed.priority,
    status: "testing",
    sort_order: index,
    created_at: now,
    updated_at: now,
  }));
  const { error } = await sb.from("v2_personal_hypotheses").insert(rows);
  if (error) {
    await sb.from("v2_personal_hypothesis_settings").delete().eq("user_id", userId);
    throw error;
  }
}

export async function loadHypothesesBoard(ctx: V2SessionContext): Promise<HypothesesBoard> {
  const userId = uid(ctx);
  await seedIfEmpty(userId);
  const [hypotheses, notes] = await Promise.all([listHypothesisRows(userId), listNoteRows(userId)]);
  return { hypotheses: attachNotes(hypotheses, notes) };
}

async function requireOwned(ctx: V2SessionContext, id: string): Promise<Hypothesis> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypotheses")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalHypothesesNotFoundError();
  return mapHypothesis(data as Record<string, unknown>);
}

export async function createPersonalHypothesis(
  ctx: V2SessionContext,
  input: {
    title?: string;
    direction?: string;
    checkText?: string;
    successText?: string;
    priority?: string;
  },
): Promise<Hypothesis> {
  const title = clip(input.title, 500);
  if (!title) throw new PersonalHypothesesValidationError("Напиши формулировку гипотезы");
  const priority = input.priority && isHypothesisPriority(input.priority) ? input.priority : "medium";
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const { data: existing, error: existingError } = await sb
    .from("v2_personal_hypotheses")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("priority", priority)
    .order("sort_order", { ascending: true })
    .limit(1);
  if (existingError) throw existingError;
  const nextSort = existing?.[0] ? Number(existing[0].sort_order) - 1 : 0;
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    direction: clip(input.direction, 160),
    title,
    check_text: clip(input.checkText, 4000),
    success_text: clip(input.successText, 4000),
    priority,
    status: "testing" as HypothesisStatus,
    sort_order: nextSort,
    created_at: now,
    updated_at: now,
  };
  const { data, error } = await sb.from("v2_personal_hypotheses").insert(row).select("*").single();
  if (error) throw error;
  return mapHypothesis(data as Record<string, unknown>);
}

export async function updatePersonalHypothesis(
  ctx: V2SessionContext,
  id: string,
  input: {
    title?: string;
    direction?: string;
    checkText?: string;
    successText?: string;
    priority?: string;
    status?: string;
  },
): Promise<Hypothesis> {
  const current = await requireOwned(ctx, id);
  const sb = getV2Supabase();
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.title !== undefined) {
    const title = clip(input.title, 500);
    if (!title) throw new PersonalHypothesesValidationError("Напиши формулировку гипотезы");
    patch.title = title;
  }
  if (input.direction !== undefined) patch.direction = clip(input.direction, 160);
  if (input.checkText !== undefined) patch.check_text = clip(input.checkText, 4000);
  if (input.successText !== undefined) patch.success_text = clip(input.successText, 4000);
  if (input.priority !== undefined) {
    if (!isHypothesisPriority(input.priority)) {
      throw new PersonalHypothesesValidationError("Неизвестный приоритет");
    }
    patch.priority = input.priority;
    if (input.priority !== current.priority) {
      const { data: top, error: topError } = await sb
        .from("v2_personal_hypotheses")
        .select("sort_order")
        .eq("user_id", uid(ctx))
        .eq("priority", input.priority)
        .order("sort_order", { ascending: true })
        .limit(1);
      if (topError) throw topError;
      patch.sort_order = top?.[0] ? Number(top[0].sort_order) - 1 : 0;
    }
  }
  if (input.status !== undefined) {
    if (!isHypothesisStatus(input.status)) {
      throw new PersonalHypothesesValidationError("Неизвестный статус");
    }
    patch.status = input.status;
  }
  const { data, error } = await sb
    .from("v2_personal_hypotheses")
    .update(patch)
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .select("*")
    .single();
  if (error) throw error;
  return mapHypothesis(data as Record<string, unknown>);
}

export async function deletePersonalHypothesis(ctx: V2SessionContext, id: string) {
  await requireOwned(ctx, id);
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_hypotheses").delete().eq("id", id).eq("user_id", uid(ctx));
  if (error) throw error;
}

export async function reorderPersonalHypotheses(ctx: V2SessionContext, items: HypothesisReorderItem[]) {
  const userId = uid(ctx);
  const existing = await listHypothesisRows(userId);
  if (items.length !== existing.length) {
    throw new PersonalHypothesesValidationError("Список устарел, обнови страницу");
  }
  const known = new Set(existing.map((item) => item.id));
  const seen = new Set<string>();
  for (const item of items) {
    if (!known.has(item.id) || seen.has(item.id)) {
      throw new PersonalHypothesesValidationError("Список устарел, обнови страницу");
    }
    if (!isHypothesisPriority(item.priority) || !Number.isInteger(item.sort_order)) {
      throw new PersonalHypothesesValidationError("Некорректный порядок");
    }
    seen.add(item.id);
  }
  const sb = getV2Supabase();
  const now = nowIso();
  const results = await Promise.all(
    items.map((item) =>
      sb
        .from("v2_personal_hypotheses")
        .update({ priority: item.priority, sort_order: item.sort_order, updated_at: now })
        .eq("id", item.id)
        .eq("user_id", userId),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

function parseDate(value: unknown): string {
  const text = String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new PersonalHypothesesValidationError("Укажи дату проверки");
  }
  return text;
}

export async function createHypothesisNote(
  ctx: V2SessionContext,
  hypothesisId: string,
  input: { body?: string; outcome?: string; happenedOn?: string },
): Promise<HypothesisNote> {
  await requireOwned(ctx, hypothesisId);
  const body = clip(input.body, 4000);
  if (!body) throw new PersonalHypothesesValidationError("Напиши, что проверил");
  if (!input.outcome || !isHypothesisOutcome(input.outcome)) {
    throw new PersonalHypothesesValidationError("Отметь, зашло или нет");
  }
  const happenedOn = input.happenedOn ? parseDate(input.happenedOn) : new Date().toISOString().slice(0, 10);
  const now = nowIso();
  const row = {
    id: newV2Id(),
    hypothesis_id: hypothesisId,
    user_id: uid(ctx),
    body,
    outcome: input.outcome as HypothesisOutcome,
    happened_on: happenedOn,
    created_at: now,
    updated_at: now,
  };
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_personal_hypothesis_notes").insert(row).select("*").single();
  if (error) throw error;
  return mapNote(data as Record<string, unknown>);
}

async function requireOwnedNote(ctx: V2SessionContext, hypothesisId: string, noteId: string) {
  await requireOwned(ctx, hypothesisId);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypothesis_notes")
    .select("*")
    .eq("id", noteId)
    .eq("hypothesis_id", hypothesisId)
    .eq("user_id", uid(ctx))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalHypothesesNotFoundError();
  return mapNote(data as Record<string, unknown>);
}

export async function updateHypothesisNote(
  ctx: V2SessionContext,
  hypothesisId: string,
  noteId: string,
  input: { body?: string; outcome?: string; happenedOn?: string },
): Promise<HypothesisNote> {
  await requireOwnedNote(ctx, hypothesisId, noteId);
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.body !== undefined) {
    const body = clip(input.body, 4000);
    if (!body) throw new PersonalHypothesesValidationError("Напиши, что проверил");
    patch.body = body;
  }
  if (input.outcome !== undefined) {
    if (!isHypothesisOutcome(input.outcome)) {
      throw new PersonalHypothesesValidationError("Отметь, зашло или нет");
    }
    patch.outcome = input.outcome;
  }
  if (input.happenedOn !== undefined) patch.happened_on = parseDate(input.happenedOn);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypothesis_notes")
    .update(patch)
    .eq("id", noteId)
    .eq("hypothesis_id", hypothesisId)
    .eq("user_id", uid(ctx))
    .select("*")
    .single();
  if (error) throw error;
  return mapNote(data as Record<string, unknown>);
}

export async function deleteHypothesisNote(ctx: V2SessionContext, hypothesisId: string, noteId: string) {
  await requireOwnedNote(ctx, hypothesisId, noteId);
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_hypothesis_notes")
    .delete()
    .eq("id", noteId)
    .eq("hypothesis_id", hypothesisId)
    .eq("user_id", uid(ctx));
  if (error) throw error;
}
