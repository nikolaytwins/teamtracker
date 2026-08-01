import { NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { deleteStrategyPin } from "@/lib/v2/strategy/pins-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const ok = await deleteStrategyPin(auth.ctx, id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("strategy pin delete:", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
