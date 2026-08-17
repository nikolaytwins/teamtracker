import { NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";

/** Список проектов агентства для привязки личного таймера (Production). */
export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  if (!isSupabaseAgencyConfigured()) {
    return NextResponse.json({ projects: [], configured: false });
  }
  try {
    const rows = await getAgencyRepoV2().listProjectsWithTotalExpenses();
    const projects = rows
      .map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ""),
        status: String(r.status ?? ""),
        businessLine: String(r.businessLine ?? "agency"),
        hourlyRateRub: Number(r.hourlyRateRub) || 0,
      }))
      .filter((p) => p.businessLine === "agency" && p.status !== "paid")
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return NextResponse.json({ projects, configured: true });
  } catch (e) {
    console.error("agency-projects for time:", e);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}
