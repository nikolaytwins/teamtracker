import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { loadS2Board, mutateS2, S2ValidationError } from "@/lib/v2/s2/repo";
import type { S2Entity } from "@/lib/v2/s2/types";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const board = await loadS2Board(auth.ctx);
    return NextResponse.json({ board });
  } catch (e) {
    console.error("s2 board:", e);
    return NextResponse.json({ error: "Failed to load strategy 2.0" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const result = await mutateS2(auth.ctx, {
      entity: body.entity as S2Entity,
      action: body.action,
      id: typeof body.id === "string" ? body.id : undefined,
      data: body.data && typeof body.data === "object" ? body.data : {},
      force: Boolean(body.force),
    });
    const board = await loadS2Board(auth.ctx);
    return NextResponse.json({ board, warning: result.warning ?? null });
  } catch (e) {
    if (e instanceof S2ValidationError) {
      return NextResponse.json({ error: e.message, code: "limit" }, { status: 409 });
    }
    console.error("s2 mutate:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
