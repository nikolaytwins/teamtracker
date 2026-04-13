/**
 * Саморегистрация: в production включите TEAM_TRACKER_SELF_REGISTER=1.
 * В dev по умолчанию разрешена; отключить: TEAM_TRACKER_SELF_REGISTER=0
 */
export function isSelfRegistrationEnabled(): boolean {
  const v = process.env.TEAM_TRACKER_SELF_REGISTER?.trim();
  if (v === "0") return false;
  if (v === "1") return true;
  return process.env.NODE_ENV !== "production";
}
