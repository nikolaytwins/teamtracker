import { getServerSession } from "@/lib/get-session";
import { effectiveUserRole } from "@/lib/require-role";
import { buildV2SessionContext } from "@/lib/v2/workspace/bootstrap";
import { isV2SupabaseConfigured } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";
import { NextResponse } from "next/server";

export async function requireV2Session(): Promise<
  { ok: true; ctx: V2SessionContext } | { ok: false; response: NextResponse }
> {
  if (!isV2SupabaseConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "v2 требует Supabase: задайте NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY, примените миграции.",
        },
        { status: 503 }
      ),
    };
  }

  const session = await getServerSession();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = effectiveUserRole(session);
  const ctx = await buildV2SessionContext(session.sub, session.name, role);
  return { ok: true, ctx };
}

export async function requireV2Admin(): Promise<
  { ok: true; ctx: V2SessionContext } | { ok: false; response: NextResponse }
> {
  const r = await requireV2Session();
  if (!r.ok) return r;
  if (r.ctx.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return r;
}
