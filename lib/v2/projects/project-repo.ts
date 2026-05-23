import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { logActivity } from "@/lib/v2/activity/log";
import { canViewProject } from "@/lib/v2/auth/permissions";
import type {
  V2ProjectRow,
  V2ProjectScope,
  V2ProjectStatus,
  V2SessionContext,
} from "@/lib/v2/types";

const PROJECT_COLORS = [
  { tint: "#3B6FF7", bg: "#E6EDFF" },
  { tint: "#E40521", bg: "#FEEFF0" },
  { tint: "#005BFF", bg: "#E5EEFF" },
  { tint: "#FF335F", bg: "#FFE3EA" },
  { tint: "#00A046", bg: "#E2F5E9" },
  { tint: "#FC3F1D", bg: "#FFE9E3" },
  { tint: "#0F4C9C", bg: "#E2EAF6" },
  { tint: "#FFDD2D", bg: "#FFF7CC" },
];

function shortFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

async function getProjectMemberIds(projectId: string): Promise<string[]> {
  const sb = getV2Supabase();
  const { data } = await sb.from("v2_project_members").select("user_id").eq("project_id", projectId);
  return (data ?? []).map((r) => r.user_id as string);
}

export async function listProjects(
  ctx: V2SessionContext,
  opts?: { scope?: V2ProjectScope; activeOnly?: boolean }
): Promise<V2ProjectRow[]> {
  const sb = getV2Supabase();
  let q = sb.from("v2_projects").select("*").eq("workspace_id", ctx.workspaceId).order("name");

  if (opts?.scope) q = q.eq("scope", opts.scope);
  if (opts?.activeOnly !== false) {
    q = q.in("status", ["not_started", "in_progress", "approval"]);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as V2ProjectRow[];
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
  memberUserIds?: string[];
  colorIndex?: number;
};

export async function createProject(ctx: V2SessionContext, input: CreateProjectInput): Promise<V2ProjectRow> {
  const sb = getV2Supabase();
  const colors = PROJECT_COLORS[input.colorIndex ?? Math.floor(Math.random() * PROJECT_COLORS.length)]!;
  const id = newV2Id();
  const ts = nowIso();

  const row: V2ProjectRow = {
    id,
    workspace_id: ctx.workspaceId,
    scope: input.scope,
    name: input.name.trim(),
    short_name: shortFromName(input.name),
    color_tint: colors.tint,
    color_bg: colors.bg,
    status: input.status ?? "in_progress",
    owner_user_id: input.scope === "personal" ? ctx.userId : null,
    created_by: ctx.userId,
    created_at: ts,
    updated_at: ts,
  };

  const { error } = await sb.from("v2_projects").insert(row);
  if (error) throw new Error(error.message);

  const memberIds = new Set(input.memberUserIds ?? []);
  memberIds.add(ctx.userId);
  if (memberIds.size > 0) {
    await sb.from("v2_project_members").upsert(
      [...memberIds].map((user_id) => ({ project_id: id, user_id, created_at: ts })),
      { onConflict: "project_id,user_id" }
    );
  }

  await logActivity(ctx, "project.created", "project", id, { name: row.name, scope: row.scope });
  return row;
}

export async function getProjectById(ctx: V2SessionContext, projectId: string): Promise<V2ProjectRow | null> {
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_projects").select("*").eq("id", projectId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const p = data as V2ProjectRow;
  const members = await getProjectMemberIds(p.id);
  if (!canViewProject(ctx, p, members)) return null;
  return p;
}

export async function updateProjectMembers(
  ctx: V2SessionContext,
  projectId: string,
  userIds: string[]
): Promise<void> {
  const project = await getProjectById(ctx, projectId);
  if (!project) throw new Error("Project not found");

  const sb = getV2Supabase();
  await sb.from("v2_project_members").delete().eq("project_id", projectId);
  const ts = nowIso();
  const ids = [...new Set(userIds)];
  if (ids.length) {
    await sb.from("v2_project_members").insert(
      ids.map((user_id) => ({ project_id: projectId, user_id, created_at: ts }))
    );
  }
}
