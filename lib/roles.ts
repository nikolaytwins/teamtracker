export type TtUserRole = "admin" | "designer" | "pm" | "member";

export const TT_USER_ROLES: TtUserRole[] = ["admin", "designer", "pm", "member"];

export const TT_ROLE_LABELS: Record<TtUserRole, string> = {
  admin: "Администратор",
  designer: "Дизайнер",
  pm: "ПМ",
  member: "Участник (без доски)",
};

export function normalizeTtUserRole(raw: string | null | undefined): TtUserRole {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "designer" || s === "pm" || s === "member") return s;
  return "admin";
}

/** Саморегистрация: только профиль и личный таймер «Другое», без канбана и командных API. */
export function isMemberRestrictedRole(role: TtUserRole): boolean {
  return role === "member";
}

/** Роль из сессии: для старых токенов без поля — admin. */
export function sessionRole(session: { role?: string | null | undefined }): TtUserRole {
  return normalizeTtUserRole(session.role);
}

export function isAdminRole(role: TtUserRole): boolean {
  return role === "admin";
}

export function canAccessAgencyRoutes(role: TtUserRole): boolean {
  return role === "admin";
}
