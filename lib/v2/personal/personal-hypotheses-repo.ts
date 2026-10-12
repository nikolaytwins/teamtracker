import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import {
  DESIGN_HYPOTHESES,
  DESIGN_PROJECTS,
  DESIGN_SPRINTS,
  LEGACY_EMPTY_PROJECTS,
  applyStageChange,
  currentSprintId,
  isHypothesisStage,
  isHypothesisVerdict,
  type Hypothesis,
  type HypothesisProject,
  type HypothesisSprint,
  type HypothesisStage,
  type HypothesisVerdict,
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
  projects: HypothesisProject[];
  sprints: HypothesisSprint[];
  hypotheses: Hypothesis[];
};

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function mapProject(row: Record<string, unknown>): HypothesisProject {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    hue: Number(row.hue) || 260,
    sort_order: Number(row.sort_order) || 0,
  };
}

function mapSprint(row: Record<string, unknown>): HypothesisSprint {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    range_label: String(row.range_label || ""),
    is_current: Boolean(row.is_current),
    sort_order: Number(row.sort_order) || 0,
  };
}

function mapHypothesis(row: Record<string, unknown>): Hypothesis {
  const stage = String(row.stage || "backlog");
  const verdict = row.verdict ? String(row.verdict) : null;
  return {
    id: String(row.id),
    project_id: row.project_id ? String(row.project_id) : null,
    sprint_id: row.sprint_id ? String(row.sprint_id) : null,
    title: String(row.title || ""),
    body: String(row.body || ""),
    metric: String(row.metric || ""),
    stage: isHypothesisStage(stage) ? stage : "backlog",
    verdict: verdict && isHypothesisVerdict(verdict) ? verdict : null,
    result_text: String(row.result_text || ""),
    sort_order: Number(row.sort_order) || 0,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

async function listProjects(userId: string): Promise<HypothesisProject[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypothesis_projects")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapProject);
}

async function listSprints(userId: string): Promise<HypothesisSprint[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypothesis_sprints")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapSprint);
}

async function listHypotheses(userId: string): Promise<Hypothesis[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypotheses")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(mapHypothesis);
}

async function ensureDesignBoard(userId: string) {
  const sb = getV2Supabase();
  const now = nowIso();
  let sprints = await listSprints(userId);
  if (!sprints.length) {
    const rows = DESIGN_SPRINTS.map((sprint, index) => ({
      id: newV2Id(),
      user_id: userId,
      name: sprint.name,
      range_label: sprint.range_label,
      is_current: sprint.is_current,
      sort_order: index,
      created_at: now,
      updated_at: now,
    }));
    const { error } = await sb.from("v2_personal_hypothesis_sprints").insert(rows);
    if (error) throw error;
    sprints = await listSprints(userId);
  }

  let projects = await listProjects(userId);
  let hypotheses = await listHypotheses(userId);
  if (!hypotheses.length) {
    const drop = projects.filter((project) => LEGACY_EMPTY_PROJECTS.includes(project.name));
    if (drop.length) {
      const { error } = await sb
        .from("v2_personal_hypothesis_projects")
        .delete()
        .eq("user_id", userId)
        .in(
          "id",
          drop.map((project) => project.id),
        );
      if (error) throw error;
      projects = projects.filter((project) => !LEGACY_EMPTY_PROJECTS.includes(project.name));
    }
    const missing = DESIGN_PROJECTS.filter((seed) => !projects.some((project) => project.name === seed.name));
    if (missing.length) {
      const rows = missing.map((seed) => ({
        id: newV2Id(),
        user_id: userId,
        name: seed.name,
        color: "#71717A",
        hue: seed.hue,
        sort_order: DESIGN_PROJECTS.findIndex((item) => item.key === seed.key),
        created_at: now,
        updated_at: now,
      }));
      const { error } = await sb.from("v2_personal_hypothesis_projects").insert(rows);
      if (error) throw error;
      projects = await listProjects(userId);
    }
    const byName = new Map(projects.map((project) => [project.name, project]));
    const sprintByName = new Map(sprints.map((sprint) => [sprint.name, sprint]));
    const rows = DESIGN_HYPOTHESES.map((seed, index) => {
      const project = byName.get(DESIGN_PROJECTS.find((item) => item.key === seed.project)?.name ?? "");
      const sprintSeed = DESIGN_SPRINTS.find((item) => item.key === seed.sprint);
      const sprint = sprintSeed ? sprintByName.get(sprintSeed.name) : undefined;
      return {
        id: newV2Id(),
        user_id: userId,
        project_id: project?.id ?? null,
        sprint_id: sprint?.id ?? null,
        title: seed.title,
        body: seed.body,
        metric: seed.metric,
        stage: seed.stage,
        verdict: seed.verdict ?? null,
        result_text: seed.result_text ?? "",
        sort_order: index,
        created_at: now,
        updated_at: now,
      };
    });
    const { error } = await sb.from("v2_personal_hypotheses").insert(rows);
    if (error) throw error;
    hypotheses = await listHypotheses(userId);
  }

  const current = currentSprintId(sprints);
  const loose = hypotheses.filter((item) => (item.stage === "active" || item.stage === "done") && !item.sprint_id);
  if (current && loose.length) {
    await Promise.all(
      loose.map((item) =>
        sb
          .from("v2_personal_hypotheses")
          .update({ sprint_id: current, updated_at: now })
          .eq("id", item.id)
          .eq("user_id", userId),
      ),
    );
  }
}

export async function loadHypothesesBoard(ctx: V2SessionContext): Promise<HypothesesBoard> {
  const userId = uid(ctx);
  await ensureDesignBoard(userId);
  const [projects, sprints, hypotheses] = await Promise.all([
    listProjects(userId),
    listSprints(userId),
    listHypotheses(userId),
  ]);
  return { projects, sprints, hypotheses };
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

async function requireOwnedProject(ctx: V2SessionContext, id: string) {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypothesis_projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalHypothesesNotFoundError();
  return mapProject(data as Record<string, unknown>);
}

async function requireOwnedSprint(ctx: V2SessionContext, id: string) {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_hypothesis_sprints")
    .select("*")
    .eq("id", id)
    .eq("user_id", uid(ctx))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new PersonalHypothesesNotFoundError();
  return mapSprint(data as Record<string, unknown>);
}

export async function createPersonalHypothesis(
  ctx: V2SessionContext,
  input: { title?: string; projectId?: string | null; stage?: string },
): Promise<Hypothesis> {
  const title = clip(input.title, 300);
  const stage: HypothesisStage =
    input.stage && isHypothesisStage(input.stage) && input.stage !== "active" ? input.stage : "backlog";
  const userId = uid(ctx);
  if (input.projectId) await requireOwnedProject(ctx, input.projectId);
  const sb = getV2Supabase();
  const { data: existing, error: existingError } = await sb
    .from("v2_personal_hypotheses")
    .select("sort_order")
    .eq("user_id", userId)
    .eq("stage", stage)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (existingError) throw existingError;
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    project_id: input.projectId || null,
    sprint_id: null,
    title,
    body: "",
    metric: "",
    stage,
    verdict: null,
    result_text: "",
    sort_order: existing?.[0] ? Number(existing[0].sort_order) + 1 : 0,
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
    body?: string;
    metric?: string;
    resultText?: string;
    verdict?: string | null;
    projectId?: string | null;
    sprintId?: string | null;
    stage?: string;
  },
): Promise<Hypothesis> {
  const current = await requireOwned(ctx, id);
  const sb = getV2Supabase();
  const userId = uid(ctx);
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.title !== undefined) patch.title = clip(input.title, 300);
  if (input.body !== undefined) patch.body = clip(input.body, 2000);
  if (input.metric !== undefined) patch.metric = clip(input.metric, 500);
  if (input.resultText !== undefined) patch.result_text = clip(input.resultText, 2000);
  if (input.verdict !== undefined) {
    if (input.verdict && !isHypothesisVerdict(input.verdict)) {
      throw new PersonalHypothesesValidationError("Неизвестный вердикт");
    }
    patch.verdict = input.verdict || null;
  }
  if (input.projectId !== undefined) {
    if (input.projectId) await requireOwnedProject(ctx, input.projectId);
    patch.project_id = input.projectId;
  }
  if (input.stage !== undefined || input.sprintId !== undefined) {
    const stage = input.stage ?? current.stage;
    if (!isHypothesisStage(stage)) throw new PersonalHypothesesValidationError("Неизвестный статус");
    const sprints = await listSprints(userId);
    const sprintId =
      input.sprintId !== undefined ? input.sprintId : (current.sprint_id ?? currentSprintId(sprints));
    if (sprintId) await requireOwnedSprint(ctx, sprintId);
    const all = await listHypotheses(userId);
    const moved = applyStageChange(all, id, stage, sprintId);
    if (!moved.ok) throw new PersonalHypothesesValidationError(moved.error);
    patch.stage = moved.item.stage;
    patch.sprint_id = moved.item.sprint_id;
  }
  const { data, error } = await sb
    .from("v2_personal_hypotheses")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
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

export async function createHypothesisSprint(
  ctx: V2SessionContext,
  input: { name?: string; rangeLabel?: string },
): Promise<HypothesisSprint> {
  const userId = uid(ctx);
  const sprints = await listSprints(userId);
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    name: clip(input.name, 80) || `Спринт ${sprints.length + 1}`,
    range_label: clip(input.rangeLabel, 80) || "даты не заданы",
    is_current: false,
    sort_order: sprints.length,
    created_at: now,
    updated_at: now,
  };
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_personal_hypothesis_sprints").insert(row).select("*").single();
  if (error) throw error;
  return mapSprint(data as Record<string, unknown>);
}

export async function createHypothesisProject(
  ctx: V2SessionContext,
  input: { name?: string; hue?: number },
): Promise<HypothesisProject> {
  const name = clip(input.name, 80);
  if (!name) throw new PersonalHypothesesValidationError("Напиши название проекта");
  const userId = uid(ctx);
  const projects = await listProjects(userId);
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    name,
    color: "#71717A",
    hue: Number.isFinite(input.hue) ? Math.round(Number(input.hue)) : 260,
    sort_order: projects.length,
    created_at: now,
    updated_at: now,
  };
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_personal_hypothesis_projects").insert(row).select("*").single();
  if (error) throw error;
  return mapProject(data as Record<string, unknown>);
}

export async function deleteHypothesisProject(ctx: V2SessionContext, id: string) {
  await requireOwnedProject(ctx, id);
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_hypothesis_projects").delete().eq("id", id).eq("user_id", uid(ctx));
  if (error) throw error;
}
