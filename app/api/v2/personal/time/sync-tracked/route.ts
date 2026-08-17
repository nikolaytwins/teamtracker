import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";

/** Записать сессию личного таймера на карточку проекта (без сметы). Идемпотентно по sourceEntryId. */
export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();

  try {
    const body = await request.json().catch(() => ({}));
    const agencyProjectId = String(body.agencyProjectId ?? "").trim();
    const sourceEntryId = String(body.sourceEntryId ?? "").trim();
    const task = String(body.task ?? "").trim();
    const activity = String(body.activity ?? "").trim();
    const durationSeconds = Math.max(1, Math.floor(Number(body.durationSeconds) || 0));
    const trackedAt = String(body.trackedAt ?? new Date().toISOString());

    if (!agencyProjectId || !sourceEntryId) {
      return NextResponse.json({ error: "agencyProjectId and sourceEntryId required" }, { status: 400 });
    }

    const repo = getAgencyRepoV2();
    const project = await repo.getProjectById(agencyProjectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const existing = await repo.getProjectTrackedTimeBySourceEntryId(sourceEntryId);
    if (existing) {
      return NextResponse.json({ tracked: existing, created: false });
    }

    const tracked = await repo.createProjectTrackedTime({
      id: `tt_${Date.now()}`,
      projectId: agencyProjectId,
      userId: auth.ctx.userId,
      sourceEntryId,
      task: task || "Сессия таймера",
      activity,
      durationSeconds,
      trackedAt,
    });
    return NextResponse.json({ tracked, created: true });
  } catch (e) {
    console.error("sync-tracked:", e);
    return NextResponse.json({ error: "Failed to sync tracked time" }, { status: 500 });
  }
}
