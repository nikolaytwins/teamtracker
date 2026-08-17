import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const inEstimate = Boolean(body.inEstimate);

    const repo = getAgencyRepoV2();
    const row = await repo.getProjectTrackedTimeById(id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const proj = await repo.getProjectById(row.projectId);
    const hourlyRateRub = Number(proj?.hourlyRateRub) || 0;

    try {
      const updated = await repo.setProjectTrackedTimeEstimate(id, inEstimate, hourlyRateRub);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, tracked: updated });
    } catch (e) {
      if (e instanceof Error && e.message === "hourly_rate_required") {
        return NextResponse.json(
          { error: "Укажите стоимость часа проекта перед добавлением в смету" },
          { status: 400 }
        );
      }
      throw e;
    }
  } catch (error) {
    console.error("Error updating tracked time estimate:", error);
    return NextResponse.json({ error: "Failed to update tracked time" }, { status: 500 });
  }
}
