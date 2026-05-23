import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { buildProjectDetail } from "@/lib/v2/projects/build-project-detail";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const workMonth = request.nextUrl.searchParams.get("month") ?? undefined;
  try {
    const detail = await buildProjectDetail(auth.ctx, id, { workMonth });
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ detail });
  } catch (e) {
    console.error("GET /api/v2/projects/[id]/detail", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
