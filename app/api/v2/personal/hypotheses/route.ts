import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { createPersonalHypothesis, loadHypothesesBoard } from "@/lib/v2/personal/personal-hypotheses-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const board = await loadHypothesesBoard(auth.ctx);
    return NextResponse.json(board);
  } catch (error) {
    return hypothesesFail(error, "Не удалось загрузить гипотезы");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const hypothesis = await createPersonalHypothesis(auth.ctx, {
      title: body.title,
      direction: body.direction,
      checkText: body.checkText ?? body.check_text,
      successText: body.successText ?? body.success_text,
      priority: body.priority,
    });
    return NextResponse.json({ hypothesis });
  } catch (error) {
    return hypothesesFail(error, "Не удалось добавить гипотезу");
  }
}
