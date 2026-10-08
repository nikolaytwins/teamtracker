import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { deletePersonalHypothesis, updatePersonalHypothesis } from "@/lib/v2/personal/personal-hypotheses-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const hypothesis = await updatePersonalHypothesis(auth.ctx, id, {
      title: body.title,
      direction: body.direction,
      checkText: body.checkText ?? body.check_text,
      successText: body.successText ?? body.success_text,
      priority: body.priority,
      status: body.status,
    });
    return NextResponse.json({ hypothesis });
  } catch (error) {
    return hypothesesFail(error, "Не удалось сохранить гипотезу");
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    await deletePersonalHypothesis(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return hypothesesFail(error, "Не удалось удалить гипотезу");
  }
}
