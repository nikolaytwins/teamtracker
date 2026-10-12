import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { hypothesesFail } from "@/lib/v2/personal/hypotheses-http";
import { createHypothesisSprint } from "@/lib/v2/personal/personal-hypotheses-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    const sprint = await createHypothesisSprint(auth.ctx, {
      name: body.name,
      rangeLabel: body.rangeLabel ?? body.range_label,
    });
    return NextResponse.json({ sprint });
  } catch (error) {
    return hypothesesFail(error, "Не удалось создать спринт");
  }
}
