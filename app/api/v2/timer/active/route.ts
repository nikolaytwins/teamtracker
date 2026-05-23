import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { getActiveSession } from "@/lib/v2/timer/timer-service";

export async function GET() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const active = await getActiveSession(auth.ctx);
  return NextResponse.json({ active });
}
