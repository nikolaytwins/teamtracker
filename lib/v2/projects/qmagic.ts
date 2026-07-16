import { getV2Supabase } from "@/lib/v2/db/client";
import { createProject, getProjectById, listProjects } from "@/lib/v2/projects/project-repo";
import type { V2ProjectRow, V2SessionContext } from "@/lib/v2/types";

export const QMAGIC_PROJECT_NAME = "Qmagic";

export function isQmagicProject(project: Pick<V2ProjectRow, "name"> | { name: string } | null | undefined): boolean {
  return Boolean(project?.name?.trim().toLowerCase() === QMAGIC_PROJECT_NAME.toLowerCase());
}

function normalizeProject(raw: Record<string, unknown>): V2ProjectRow {
  return {
    ...(raw as V2ProjectRow),
    engagement_type: raw.engagement_type === "retainer" ? "retainer" : "one_off",
    client_access_enabled: Boolean(raw.client_access_enabled),
    client_id: typeof raw.client_id === "string" ? raw.client_id : null,
    project_kind:
      raw.project_kind === "site" || raw.project_kind === "presentation" || raw.project_kind === "small_task"
        ? raw.project_kind
        : null,
    paid_rub: typeof raw.paid_rub === "number" ? Math.round(raw.paid_rub) : null,
    priority:
      raw.priority === "urgent" || raw.priority === "high" || raw.priority === "medium" || raw.priority === "low"
        ? raw.priority
        : "medium",
  };
}

/** Поиск по имени в workspace (без фильтра видимости — чтобы не плодить дубли). */
export async function findQmagicProjectRaw(ctx: V2SessionContext): Promise<V2ProjectRow | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_projects")
    .select("*")
    .eq("workspace_id", ctx.workspaceId)
    .ilike("name", QMAGIC_PROJECT_NAME)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeProject(data as Record<string, unknown>);
}

export async function findQmagicProject(ctx: V2SessionContext): Promise<V2ProjectRow | null> {
  const visible = await listProjects(ctx, { statusGroup: "all" });
  const fromVisible = visible.find((p) => isQmagicProject(p));
  if (fromVisible) return fromVisible;
  const raw = await findQmagicProjectRaw(ctx);
  if (!raw) return null;
  return getProjectById(ctx, raw.id);
}

/** Создаёт проект Qmagic, если его ещё нет в workspace. */
export async function ensureQmagicProject(ctx: V2SessionContext): Promise<V2ProjectRow> {
  const raw = await findQmagicProjectRaw(ctx);
  if (raw) {
    const visible = await getProjectById(ctx, raw.id);
    if (visible) return visible;
    // Уже есть, но пользователь не член — вернём raw для id; UI портфолио отфильтрует.
    return raw;
  }

  return createProject(ctx, {
    name: QMAGIC_PROJECT_NAME,
    scope: "team",
    status: "in_progress",
    engagementType: "one_off",
    priority: "high",
    projectKind: "site",
    teamMemberUserIds: [ctx.userId],
  });
}
