import { listUsersPublic } from "@/lib/tt-auth-db";
import type { TtUserRole } from "@/lib/roles";
import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import { V2_DEFAULT_WORKSPACE_ID } from "@/lib/v2/types";
import type { V2SessionContext, V2WorkspaceMemberRow } from "@/lib/v2/types";

export async function ensureWorkspaceMember(userId: string, role: TtUserRole): Promise<V2WorkspaceMemberRow> {
  const sb = getV2Supabase();
  const { data: existing } = await sb
    .from("v2_workspace_members")
    .select("*")
    .eq("workspace_id", V2_DEFAULT_WORKSPACE_ID)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return existing as V2WorkspaceMemberRow;
  }

  const row = {
    workspace_id: V2_DEFAULT_WORKSPACE_ID,
    user_id: userId,
    role,
    weekly_hours_norm: 40,
    created_at: nowIso(),
  };

  const { data, error } = await sb.from("v2_workspace_members").insert(row).select("*").single();
  if (error) throw new Error(`ensureWorkspaceMember: ${error.message}`);
  return data as V2WorkspaceMemberRow;
}

/** Синхронизирует всех tt_users в workspace members (идемпотентно). */
export async function syncAllWorkspaceMembers(): Promise<number> {
  const sb = getV2Supabase();
  const users = listUsersPublic();
  if (users.length === 0) return 0;

  const rows = users.map((u) => ({
    workspace_id: V2_DEFAULT_WORKSPACE_ID,
    user_id: u.id,
    role: u.role,
    weekly_hours_norm: u.weekly_capacity_hours ?? 40,
    created_at: nowIso(),
  }));

  const { error } = await sb.from("v2_workspace_members").upsert(rows, {
    onConflict: "workspace_id,user_id",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`syncAllWorkspaceMembers: ${error.message}`);
  return users.length;
}

export async function buildV2SessionContext(
  userId: string,
  userName: string,
  role: TtUserRole
): Promise<V2SessionContext> {
  await syncAllWorkspaceMembers();
  await ensureWorkspaceMember(userId, role);
  return {
    userId,
    userName,
    role,
    workspaceId: V2_DEFAULT_WORKSPACE_ID,
  };
}

export async function listWorkspaceMembers(): Promise<
  Array<V2WorkspaceMemberRow & { display_name: string; job_title: string; avatar_url: string | null }>
> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_workspace_members")
    .select("*")
    .eq("workspace_id", V2_DEFAULT_WORKSPACE_ID);
  if (error) throw new Error(error.message);

  const users = listUsersPublic();
  const byId = new Map(users.map((u) => [u.id, u]));

  return (data ?? []).map((m) => {
    const u = byId.get(m.user_id as string);
    return {
      ...(m as V2WorkspaceMemberRow),
      display_name: u?.display_name ?? m.user_id,
      job_title: u?.job_title ?? "",
      avatar_url: u?.avatar_url ?? null,
    };
  });
}
