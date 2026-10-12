import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { deleteHypothesisProject } from "@/lib/v2/personal/personal-hypotheses-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    await deleteHypothesisProject(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return hypothesesFail(error, "Не удалось удалить проект");
  }
}
