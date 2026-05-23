import { getV2Supabase } from "@/lib/v2/db/client";
import { canViewTask } from "@/lib/v2/auth/permissions";
import type { V2SessionContext } from "@/lib/v2/types";

export async function searchV2(
  ctx: V2SessionContext,
  query: string
): Promise<{
  tasks: Array<{ id: string; title: string; project_id: string | null }>;
  projects: Array<{ id: string; name: string }>;
}> {
  const q = query.trim();
  if (!q) return { tasks: [], projects: [] };

  const sb = getV2Supabase();
  const pattern = `%${q.replace(/%/g, "\\%")}%`;

  const { data: tasks } = await sb
    .from("v2_tasks")
    .select("id, title, project_id, scope, assignee_user_id, created_by")
    .eq("workspace_id", ctx.workspaceId)
    .is("deleted_at", null)
    .ilike("title", pattern)
    .limit(20);

  const { data: projects } = await sb
    .from("v2_projects")
    .select("id, name")
    .eq("workspace_id", ctx.workspaceId)
    .ilike("name", pattern)
    .limit(10);

  return {
    tasks: ((tasks ?? []) as Array<{ id: string; title: string; project_id: string | null; scope: string; assignee_user_id: string | null; created_by: string }>)
      .filter((t) => canViewTask(ctx, t as never))
      .map((t) => ({ id: t.id, title: t.title, project_id: t.project_id })),
    projects: (projects ?? []) as Array<{ id: string; name: string }>,
  };
}
