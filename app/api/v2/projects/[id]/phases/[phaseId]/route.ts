import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { deleteProjectPhase, updateProjectPhase } from "@/lib/v2/projects/project-phases-repo";

type RouteCtx = { params: Promise<{ id: string; phaseId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id, phaseId } = await params;

  try {
    const body = await request.json();
    const phase = await updateProjectPhase(auth.ctx, id, phaseId, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: body.description !== undefined ? body.description : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });
    return NextResponse.json({ phase });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id, phaseId } = await params;

  try {
    await deleteProjectPhase(auth.ctx, id, phaseId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
