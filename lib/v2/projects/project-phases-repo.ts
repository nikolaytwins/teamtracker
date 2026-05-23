import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { canManageProjectMembers } from "@/lib/v2/auth/permissions";
import { getProjectById } from "@/lib/v2/projects/project-repo";
import type { V2ProjectPhaseRow, V2SessionContext } from "@/lib/v2/types";

export async function listProjectPhases(projectId: string): Promise<V2ProjectPhaseRow[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_project_phases")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as V2ProjectPhaseRow[];
}

export async function createProjectPhase(
  ctx: V2SessionContext,
  projectId: string,
  input: { title: string; description?: string | null }
): Promise<V2ProjectPhaseRow> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");
  if (project.engagement_type === "retainer") throw new Error("Retainer projects have no phases");
  if (!canManageProjectMembers(ctx) && project.created_by !== ctx.userId) {
    throw new Error("Forbidden");
  }

  const sb = getV2Supabase();
  const { data: existing } = await sb
    .from("v2_project_phases")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = ((existing?.[0]?.sort_order as number | undefined) ?? -1) + 1;

  const row: V2ProjectPhaseRow = {
    id: newV2Id(),
    project_id: projectId,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    sort_order: nextOrder,
    created_at: nowIso(),
  };
  const { error } = await sb.from("v2_project_phases").insert(row);
  if (error) throw new Error(error.message);
  return row;
}

export async function updateProjectPhase(
  ctx: V2SessionContext,
  projectId: string,
  phaseId: string,
  input: Partial<{ title: string; description: string | null; sortOrder: number }>
): Promise<V2ProjectPhaseRow> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");
  if (!canManageProjectMembers(ctx) && project.created_by !== ctx.userId) {
    throw new Error("Forbidden");
  }

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  const sb = getV2Supabase();
  const { error } = await sb.from("v2_project_phases").update(patch).eq("id", phaseId).eq("project_id", projectId);
  if (error) throw new Error(error.message);

  const { data, error: readErr } = await sb
    .from("v2_project_phases")
    .select("*")
    .eq("id", phaseId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!data) throw new Error("Phase not found");
  return data as V2ProjectPhaseRow;
}

export async function deleteProjectPhase(ctx: V2SessionContext, projectId: string, phaseId: string): Promise<void> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");
  if (!canManageProjectMembers(ctx) && project.created_by !== ctx.userId) {
    throw new Error("Forbidden");
  }

  const sb = getV2Supabase();
  await sb.from("v2_tasks").update({ phase_id: null }).eq("phase_id", phaseId);
  const { error } = await sb.from("v2_project_phases").delete().eq("id", phaseId).eq("project_id", projectId);
  if (error) throw new Error(error.message);
}
