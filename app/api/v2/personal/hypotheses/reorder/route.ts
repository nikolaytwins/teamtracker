import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { isHypothesisStage } from "@/lib/v2/personal/hypotheses-meta";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import {
  PersonalHypothesesValidationError,
  updatePersonalHypothesis,
} from "@/lib/v2/personal/personal-hypotheses-repo";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const id = String(body.id ?? "");
    const stage = String(body.stage ?? "");
    if (!id || !isHypothesisStage(stage)) {
      throw new PersonalHypothesesValidationError("Некуда поставить гипотезу");
    }
    const hypothesis = await updatePersonalHypothesis(auth.ctx, id, {
      stage,
      sprintId: body.sprintId === undefined ? undefined : body.sprintId || null,
    });
    return NextResponse.json({ hypothesis });
  } catch (error) {
    return hypothesesFail(error, "Не удалось переставить гипотезу");
  }
}
