import { getV2Supabase } from "@/lib/v2/db/client";
import type { V2ProjectMemberRole } from "@/lib/v2/types";

export type ProjectMember = {
  userId: string;
  role: V2ProjectMemberRole;
};

export async function fetchMemberProjectIds(userId: string): Promise<Set<string>> {
  const sb = getV2Supabase();
  const { data, error } = await sb.from("v2_project_members").select("project_id").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.project_id as string));
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_project_members")
    .select("user_id, member_role")
    .eq("project_id", projectId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    userId: r.user_id as string,
    role: (r.member_role as V2ProjectMemberRole) ?? "team",
  }));
}

export async function getProjectMemberIds(projectId: string): Promise<string[]> {
  const members = await getProjectMembers(projectId);
  return members.map((m) => m.userId);
}

export async function getMemberRoleForUser(
  projectId: string,
  userId: string
): Promise<V2ProjectMemberRole | null> {
  const members = await getProjectMembers(projectId);
  return members.find((m) => m.userId === userId)?.role ?? null;
}

export async function replaceProjectMembers(
  projectId: string,
  members: ProjectMember[],
  createdAt?: string
): Promise<void> {
  const sb = getV2Supabase();
  await sb.from("v2_project_members").delete().eq("project_id", projectId);
  const ts = createdAt ?? new Date().toISOString();
  const unique = new Map<string, V2ProjectMemberRole>();
  for (const m of members) unique.set(m.userId, m.role);
  if (unique.size === 0) return;
  await sb.from("v2_project_members").insert(
    [...unique.entries()].map(([user_id, member_role]) => ({
      project_id: projectId,
      user_id,
      member_role,
      created_at: ts,
    }))
  );
}
