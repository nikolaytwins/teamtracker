import { isAdminRole, type TtUserRole } from "@/lib/roles";
import type { V2ProjectRow, V2TaskRow, V2SessionContext } from "@/lib/v2/types";

export function canViewAllTeamData(role: TtUserRole): boolean {
  return isAdminRole(role);
}

export function canViewTask(ctx: V2SessionContext, task: Pick<V2TaskRow, "scope" | "assignee_user_id" | "created_by">): boolean {
  if (task.scope === "personal") {
    return task.assignee_user_id === ctx.userId || task.created_by === ctx.userId;
  }
  if (canViewAllTeamData(ctx.role)) return true;
  return task.assignee_user_id === ctx.userId || task.created_by === ctx.userId;
}

export function canEditTask(ctx: V2SessionContext, task: Pick<V2TaskRow, "scope" | "assignee_user_id" | "created_by">): boolean {
  if (canViewAllTeamData(ctx.role)) return true;
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
  if (canViewAllTeamData(ctx.role)) return true;
  return memberUserIds.includes(ctx.userId) || project.created_by === ctx.userId;
}
