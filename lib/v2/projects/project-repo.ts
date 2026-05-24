import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { logActivity } from "@/lib/v2/activity/log";
import { findOrCreateClient } from "@/lib/v2/clients/client-repo";
import { canManageProjectMembers, canViewProject } from "@/lib/v2/auth/permissions";
import {
  getProjectMemberIds,
  getProjectMembers,
  replaceProjectMembers,
  type ProjectMember,
} from "@/lib/v2/projects/project-members-repo";
import type {
  V2ProjectEngagementType,
  V2ProjectKind,
  V2ProjectRow,
  V2ProjectScope,
  V2ProjectStatus,
  V2SessionContext,
  V2TaskPriority,
} from "@/lib/v2/types";
import { isV2ProjectKind } from "@/lib/v2/projects/project-kind";

import { pickProjectColor, V2_PROJECT_COLORS } from "@/lib/v2/project-colors";

function shortFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function normalizeProjectRow(raw: Record<string, unknown>): V2ProjectRow {
  const priority = raw.priority;
  const validPriority =
    priority === "urgent" || priority === "high" || priority === "medium" || priority === "low"
      ? priority
      : "medium";

  return {
    ...(raw as V2ProjectRow),
    engagement_type: raw.engagement_type === "retainer" ? "retainer" : "one_off",
    client_access_enabled: Boolean(raw.client_access_enabled),
    client_id: typeof raw.client_id === "string" ? raw.client_id : null,
    project_kind: isV2ProjectKind(raw.project_kind) ? raw.project_kind : null,
    paid_rub: typeof raw.paid_rub === "number" ? Math.round(raw.paid_rub) : null,
    priority: validPriority,
  };
}

export async function listProjects(
  ctx: V2SessionContext,
  opts?: { scope?: V2ProjectScope; statusGroup?: "active" | "paused" | "completed" | "all" }
): Promise<V2ProjectRow[]> {
  const sb = getV2Supabase();
  let q = sb.from("v2_projects").select("*").eq("workspace_id", ctx.workspaceId).order("name");

  if (opts?.scope) q = q.eq("scope", opts.scope);

  const group = opts?.statusGroup ?? "active";
  if (group === "active") {
    q = q.in("status", ["not_started", "in_progress", "approval"]);
  } else if (group === "paused") {
    q = q.eq("status", "paused");
  } else if (group === "completed") {
    q = q.in("status", ["completed", "completed_unpaid"]);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((r) => normalizeProjectRow(r as Record<string, unknown>));
  const visible: V2ProjectRow[] = [];
  for (const p of rows) {
    const members = await getProjectMemberIds(p.id);
    if (canViewProject(ctx, p, members)) visible.push(p);
  }
  return visible;
}

export type CreateProjectInput = {
  name: string;
  scope: V2ProjectScope;
  status?: V2ProjectStatus;
  engagementType?: V2ProjectEngagementType;
  clientAccessEnabled?: boolean;
  contractRef?: string | null;
  releaseAt?: string | null;
  /** Полная сумма проекта по договору, хранится в budget_rub. */
  projectSumRub?: number | null;
  budgetRub?: number | null;
  clientName?: string | null;
  clientId?: string | null;
  projectKind?: V2ProjectKind | null;
  /** Фактически оплачено клиентом (предоплата и т.д.), хранится в paid_rub. */
  paidRub?: number | null;
  priority?: V2TaskPriority;
  teamMemberUserIds?: string[];
  clientUserIds?: string[];
  memberUserIds?: string[];
  colorIndex?: number;
};

function buildMemberRows(
  ctx: V2SessionContext,
  input: CreateProjectInput
): ProjectMember[] {
  const members = new Map<string, ProjectMember["role"]>();
  members.set(ctx.userId, "lead");

  for (const id of input.teamMemberUserIds ?? input.memberUserIds ?? []) {
    if (id !== ctx.userId) members.set(id, "team");
  }
  for (const id of input.clientUserIds ?? []) {
    members.set(id, "client");
  }

  return [...members.entries()].map(([userId, role]) => ({ userId, role }));
}

export async function createProject(ctx: V2SessionContext, input: CreateProjectInput): Promise<V2ProjectRow> {
  const sb = getV2Supabase();
  const colors = pickProjectColor(input.colorIndex ?? Math.floor(Math.random() * V2_PROJECT_COLORS.length));
  const id = newV2Id();
  const ts = nowIso();
  const engagementType = input.engagementType === "retainer" ? "retainer" : "one_off";
  const clientAccessEnabled = Boolean(input.clientAccessEnabled);
  const projectSumRub = input.projectSumRub ?? input.budgetRub ?? null;
  const paidRub = input.paidRub ?? null;
  const priority = input.priority ?? "medium";
  const projectKind =
    engagementType === "retainer" ? null : input.projectKind && isV2ProjectKind(input.projectKind) ? input.projectKind : null;

  let clientId: string | null = input.clientId?.trim() || null;
  if (!clientId && input.clientName?.trim()) {
    clientId = await findOrCreateClient(ctx, input.clientName);
  }

  const row: V2ProjectRow = {
    id,
    workspace_id: ctx.workspaceId,
    scope: input.scope,
    name: input.name.trim(),
    short_name: shortFromName(input.name),
    color_tint: colors.tint,
    color_bg: colors.bg,
    color_ink: colors.ink ?? colors.tint,
    status: input.status ?? "not_started",
    owner_user_id: input.scope === "personal" ? ctx.userId : null,
    contract_ref: input.contractRef?.trim() || null,
    release_at: input.releaseAt ?? null,
    budget_rub: projectSumRub,
    paid_rub: paidRub,
    project_kind: projectKind,
    priority,
    engagement_type: engagementType,
    client_access_enabled: clientAccessEnabled,
    client_id: clientId,
    created_by: ctx.userId,
    created_at: ts,
    updated_at: ts,
  };

  const { error } = await sb.from("v2_projects").insert(row);
  if (error) throw new Error(error.message);

  const memberRows = buildMemberRows(ctx, input);
  if (memberRows.length > 0) {
    await replaceProjectMembers(id, memberRows, ts);
  }

  await logActivity(ctx, "project.created", "project", id, {
    name: row.name,
    scope: row.scope,
    engagement_type: row.engagement_type,
    client_access_enabled: row.client_access_enabled,
    client_id: row.client_id,
    project_kind: row.project_kind,
    paid_rub: row.paid_rub,
    priority: row.priority,
    contract_ref: row.contract_ref,
    release_at: row.release_at,
    budget_rub: row.budget_rub,
  });
  return row;
}

export async function getProjectById(ctx: V2SessionContext, projectId: string): Promise<V2ProjectRow | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_projects").select("*").eq("id", projectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const p = normalizeProjectRow(data as Record<string, unknown>);
  const members = await getProjectMemberIds(p.id);
  if (!canViewProject(ctx, p, members)) return null;
  return p;
}

export async function updateProject(
  ctx: V2SessionContext,
  projectId: string,
  input: Partial<{
    name: string;
    status: V2ProjectStatus;
    clientAccessEnabled: boolean;
    engagementType: V2ProjectEngagementType;
    contractRef: string | null;
    releaseAt: string | null;
    budgetRub: number | null;
    paidRub: number | null;
  }>
): Promise<V2ProjectRow> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");
  if (!canManageProjectMembers(ctx)) throw new Error("Forbidden");

  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.name !== undefined) {
    patch.name = input.name.trim();
    patch.short_name = shortFromName(input.name);
  }
  if (input.status !== undefined) patch.status = input.status;
  if (input.clientAccessEnabled !== undefined) patch.client_access_enabled = input.clientAccessEnabled;
  if (input.engagementType !== undefined) patch.engagement_type = input.engagementType;
  if (input.contractRef !== undefined) patch.contract_ref = input.contractRef?.trim() || null;
  if (input.releaseAt !== undefined) patch.release_at = input.releaseAt;
  if (input.budgetRub !== undefined) patch.budget_rub = input.budgetRub;
  if (input.paidRub !== undefined) patch.paid_rub = input.paidRub;

  const sb = getV2Supabase();
  const { error } = await sb.from("v2_projects").update(patch).eq("id", projectId);
  if (error) throw error;

  await logActivity(ctx, "project.updated", "project", projectId, {
    status: input.status,
    name: input.name,
    client_access_enabled: input.clientAccessEnabled,
    engagement_type: input.engagementType,
    contract_ref: input.contractRef,
    release_at: input.releaseAt,
    budget_rub: input.budgetRub,
    paid_rub: input.paidRub,
  });
  const updated = await getProjectById(ctx, projectId);
  if (!updated) throw new Error("Project not found after update");
  return updated;
}

export async function updateProjectMembers(
  ctx: V2SessionContext,
  projectId: string,
  members: ProjectMember[]
): Promise<void> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");
  if (!canManageProjectMembers(ctx)) throw new Error("Forbidden");

  await replaceProjectMembers(projectId, members);
}

export async function deleteProject(ctx: V2SessionContext, projectId: string): Promise<void> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");
  if (!canManageProjectMembers(ctx)) throw new Error("Forbidden");

  const sb = getV2Supabase();
  const { error } = await sb.from("v2_projects").delete().eq("id", projectId).eq("workspace_id", ctx.workspaceId);
  if (error) throw new Error(error.message);

  await logActivity(ctx, "project.deleted", "project", projectId, { name: project.name });
}

export { getProjectMembers, getProjectMemberIds };
