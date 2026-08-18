import { listUsersPublic } from "@/lib/tt-auth-db";
import { buildV2SessionContext } from "@/lib/v2/workspace/bootstrap";
import type { V2SessionContext } from "@/lib/v2/types";

export class SophiaIntegrationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SophiaIntegrationConfigError";
  }
}

/** Пользователь, от имени которого Sophia пишет в личный дневник. */
export async function resolveSophiaIntegrationContext(): Promise<V2SessionContext> {
  const users = listUsersPublic();
  if (users.length === 0) {
    throw new SophiaIntegrationConfigError("В Team Tracker нет пользователей");
  }

  const envUserId = process.env.TT_INTEGRATION_USER_ID?.trim();
  const user =
    (envUserId ? users.find((u) => u.id === envUserId) : undefined) ??
    users.find((u) => u.role === "admin") ??
    users[0];

  if (!user) {
    throw new SophiaIntegrationConfigError("Не удалось выбрать пользователя для интеграции");
  }

  return buildV2SessionContext(user.id, user.display_name, user.role);
}
