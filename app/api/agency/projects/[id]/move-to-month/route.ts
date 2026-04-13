import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

/** Перенос проекта на другой месяц (меняем createdAt на первый день целевого месяца) */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const year = Number(body.year);
    const month = Number(body.month);

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    try {
      await getAgencyRepo().moveProjectToMonth(params.id, year, month);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "not_found") {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error moving project:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to move project", details: message }, { status: 500 });
  }
}
