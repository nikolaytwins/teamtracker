import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";
import { ensureCardForAgencyProject } from "@/lib/db";

/** Копировать проект (и все его расходы) на другой месяц */
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

    let newProject: { id: string; name: string; deadline: string | null };
    try {
      newProject = await getAgencyRepo().copyProjectToMonth(params.id, year, month);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === "not_found") {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      throw e;
    }

    try {
      ensureCardForAgencyProject({
        id: newProject.id,
        name: newProject.name,
        deadline: newProject.deadline ?? null,
      });
    } catch (syncErr) {
      console.error("ensureCardForAgencyProject after copy:", syncErr);
    }

    return NextResponse.json({ success: true, project: newProject });
  } catch (error: unknown) {
    console.error("Error copying project:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to copy project", details: message }, { status: 500 });
  }
}
