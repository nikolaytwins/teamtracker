import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { createHypothesisNote } from "@/lib/v2/personal/personal-hypotheses-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const note = await createHypothesisNote(auth.ctx, id, {
      body: body.body,
      outcome: body.outcome,
      happenedOn: body.happenedOn ?? body.happened_on,
    });
    return NextResponse.json({ note });
  } catch (error) {
    return hypothesesFail(error, "Не удалось записать проверку");
  }
}
