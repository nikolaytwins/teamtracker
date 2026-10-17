import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { loadHypothesisPage, saveHypothesisWorkspace } from "@/lib/v2/personal/personal-hypotheses-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const page = await loadHypothesisPage(auth.ctx, id);
    return NextResponse.json(page);
  } catch (error) {
    return hypothesesFail(error, "Не удалось открыть гипотезу");
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  try {
    const body = await request.json();
    const saved = await saveHypothesisWorkspace(auth.ctx, id, body.workspace ?? body);
    return NextResponse.json(saved);
  } catch (error) {
    return hypothesesFail(error, "Не удалось сохранить гипотезу");
  }
}
