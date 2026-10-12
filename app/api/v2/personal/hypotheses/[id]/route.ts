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
      body: body.body,
      metric: body.metric,
      resultText: body.resultText ?? body.result_text,
      verdict: body.verdict,
      projectId: body.projectId === undefined ? undefined : body.projectId || null,
      sprintId: body.sprintId === undefined ? undefined : body.sprintId || null,
      stage: body.stage,
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
