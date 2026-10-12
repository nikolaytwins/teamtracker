import { NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { loadHomeSprintChecks, saveHomeSprintChecks, sanitizeSprintChecks } from "@/lib/v2/personal/home-sprint-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const checks = await loadHomeSprintChecks(auth.ctx);
    return NextResponse.json({ checks });
  } catch (error) {
    return hypothesesFail(error, "Не удалось загрузить спринт");
  }
}

export async function PATCH(request: Request) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const checks = await saveHomeSprintChecks(auth.ctx, sanitizeSprintChecks(body.checks));
    return NextResponse.json({ checks });
  } catch (error) {
    return hypothesesFail(error, "Не удалось сохранить спринт");
  }
}
