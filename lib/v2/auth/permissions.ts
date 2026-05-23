import { isAdminRole, isClientRole, type TtUserRole } from "@/lib/roles";
import type { V2ProjectMemberRole, V2ProjectRow, V2TaskRow, V2SessionContext } from "@/lib/v2/types";

export function canViewAllTeamData(role: TtUserRole): boolean {
  return isAdminRole(role);
}

export function canViewTask(
  ctx: V2SessionContext,
  task: Pick<V2TaskRow, "scope" | "assignee_user_id" | "created_by" | "project_id">,
  opts?: { memberProjectIds?: Set<string> }
): boolean {
  if (task.scope === "personal") {
    return task.assignee_user_id === ctx.userId || task.created_by === ctx.userId;
  }
  if (canViewAllTeamData(ctx.role) || ctx.role === "pm") return true;
  if (task.project_id && opts?.memberProjectIds?.has(task.project_id)) return true;
  return task.assignee_user_id === ctx.userId || task.created_by === ctx.userId;
}

export function canEditTask(
  ctx: V2SessionContext,
  task: Pick<V2TaskRow, "scope" | "assignee_user_id" | "created_by" | "project_id">,
  opts?: { memberProjectIds?: Set<string>; projectMemberRole?: V2ProjectMemberRole | null }
): boolean {
  if (canViewAllTeamData(ctx.role) || ctx.role === "pm") return true;
  if (task.project_id && opts?.memberProjectIds?.has(task.project_id)) {
    if (opts.projectMemberRole === "client") {
      return task.created_by === ctx.userId;
    }
    return true;
  }
  return task.assignee_user_id === ctx.userId || task.created_by === ctx.userId;
}

export function canViewProject(
  ctx: V2SessionContext,
  project: Pick<V2ProjectRow, "scope" | "owner_user_id" | "created_by">,
  memberUserIds: string[]
): boolean {
  if (project.scope === "personal") {
    return project.owner_user_id === ctx.userId || project.created_by === ctx.userId;
  }
  if (canViewAllTeamData(ctx.role) || ctx.role === "pm") return true;
  return memberUserIds.includes(ctx.userId) || project.created_by === ctx.userId;
}

export function canCreateProjectTask(
  ctx: V2SessionContext,
  project: Pick<V2ProjectRow, "client_access_enabled">,
  memberRole: V2ProjectMemberRole | null
): boolean {
  if (canViewAllTeamData(ctx.role) || ctx.role === "pm") return true;
  if (!memberRole) return false;
  if (memberRole === "client") return project.client_access_enabled;
  return memberRole === "team" || memberRole === "lead";
}

export function canManageProjectMembers(ctx: V2SessionContext): boolean {
  return canViewAllTeamData(ctx.role) || ctx.role === "pm";
}

export function canViewUnassignedQueue(role: TtUserRole): boolean {
  return canViewAllTeamData(role) || role === "pm";
}

export function isRestrictedClientSession(role: TtUserRole): boolean {
  return isClientRole(role);
}
