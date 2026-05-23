import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { createProject, listProjects } from "@/lib/v2/projects/project-repo";
import type { V2ProjectScope } from "@/lib/v2/types";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const scope = request.nextUrl.searchParams.get("scope") as V2ProjectScope | null;
  const statusGroup = request.nextUrl.searchParams.get("statusGroup") as
    | "active"
    | "paused"
    | "completed"
    | "all"
    | null;
  const projects = await listProjects(auth.ctx, {
    scope: scope ?? undefined,
    statusGroup: statusGroup ?? "active",
  });
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const scope = body.scope === "personal" ? "personal" : "team";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const memberUserIds = Array.isArray(body.memberUserIds)
      ? body.memberUserIds.filter((x: unknown) => typeof x === "string")
      : undefined;

    const status =
      body.status === "not_started" ||
      body.status === "in_progress" ||
      body.status === "approval" ||
      body.status === "completed" ||
      body.status === "paused"
        ? body.status
        : undefined;

    const engagementType = body.engagementType === "retainer" ? "retainer" : "one_off";
    const clientAccessEnabled = Boolean(body.clientAccessEnabled);

    const teamMemberUserIds = Array.isArray(body.teamMemberUserIds)
      ? body.teamMemberUserIds.filter((x: unknown) => typeof x === "string")
      : memberUserIds;

    const clientUserIds = Array.isArray(body.clientUserIds)
      ? body.clientUserIds.filter((x: unknown) => typeof x === "string")
      : undefined;

    const contractRef = typeof body.contractRef === "string" ? body.contractRef.trim() || null : null;
    const releaseAt = typeof body.releaseAt === "string" && body.releaseAt.trim() ? body.releaseAt.trim() : null;
    const budgetRub =
      typeof body.budgetRub === "number" && Number.isFinite(body.budgetRub) ? Math.round(body.budgetRub) : null;

    const project = await createProject(auth.ctx, {
      name,
      scope,
      memberUserIds,
      teamMemberUserIds,
      clientUserIds,
      status,
      engagementType,
      clientAccessEnabled,
      contractRef,
      releaseAt,
      budgetRub,
    });
    return NextResponse.json({ project });
  } catch (e) {
    console.error("POST /api/v2/projects", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
