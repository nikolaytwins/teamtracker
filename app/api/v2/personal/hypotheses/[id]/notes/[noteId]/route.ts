import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { deleteHypothesisNote, updateHypothesisNote } from "@/lib/v2/personal/personal-hypotheses-repo";

type Ctx = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id, noteId } = await ctx.params;
  try {
    const body = await request.json();
    const note = await updateHypothesisNote(auth.ctx, id, noteId, {
      body: body.body,
      outcome: body.outcome,
      happenedOn: body.happenedOn ?? body.happened_on,
    });
    return NextResponse.json({ note });
  } catch (error) {
    return hypothesesFail(error, "Не удалось сохранить запись");
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id, noteId } = await ctx.params;
  try {
    await deleteHypothesisNote(auth.ctx, id, noteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return hypothesesFail(error, "Не удалось удалить запись");
  }
}
