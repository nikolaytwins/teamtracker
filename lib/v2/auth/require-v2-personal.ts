import { NextResponse } from "next/server";
import { isClientRole } from "@/lib/roles";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";

/** Личный раздел v2: любой авторизованный пользователь, кроме роли client. */
export async function requireV2Personal() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth;
  if (isClientRole(auth.ctx.role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return auth;
}

/** @deprecated alias */
export const requireV2PersonalFinance = requireV2Personal;
