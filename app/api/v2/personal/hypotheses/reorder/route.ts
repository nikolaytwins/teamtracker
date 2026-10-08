import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { isHypothesisPriority } from "@/lib/v2/personal/hypotheses-meta";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import {
  PersonalHypothesesValidationError,
  reorderPersonalHypotheses,
} from "@/lib/v2/personal/personal-hypotheses-repo";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const raw = Array.isArray(body.items) ? body.items : null;
    if (!raw) throw new PersonalHypothesesValidationError("Нужен порядок гипотез");
    const items = raw.map((item: { id?: unknown; priority?: unknown; sort_order?: unknown }) => {
      const priority = String(item.priority ?? "");
      if (!isHypothesisPriority(priority)) {
        throw new PersonalHypothesesValidationError("Некорректный порядок");
      }
      return {
        id: String(item.id ?? ""),
        priority,
        sort_order: Number(item.sort_order),
      };
    });
    await reorderPersonalHypotheses(auth.ctx, items);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return hypothesesFail(error, "Не удалось сохранить порядок");
  }
}
