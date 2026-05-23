import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { getProjectById, updateProject, updateProjectMembers } from "@/lib/v2/projects/project-repo";
import type { V2ProjectEngagementType, V2ProjectMemberRole, V2ProjectStatus } from "@/lib/v2/types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const project = await getProjectById(auth.ctx, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const status = body.status as V2ProjectStatus | undefined;
    const name = typeof body.name === "string" ? body.name : undefined;
    const clientAccessEnabled =
      typeof body.clientAccessEnabled === "boolean" ? body.clientAccessEnabled : undefined;
    const engagementType =
      body.engagementType === "retainer" || body.engagementType === "one_off"
        ? (body.engagementType as V2ProjectEngagementType)
        : undefined;

    const project = await updateProject(auth.ctx, id, { status, name, clientAccessEnabled, engagementType });

    if (Array.isArray(body.teamMemberUserIds) || Array.isArray(body.clientUserIds)) {
      const teamIds = Array.isArray(body.teamMemberUserIds)
        ? body.teamMemberUserIds.filter((x: unknown) => typeof x === "string")
        : [];
      const clientIds = Array.isArray(body.clientUserIds)
        ? body.clientUserIds.filter((x: unknown) => typeof x === "string")
        : [];
      const members: Array<{ userId: string; role: V2ProjectMemberRole }> = [
        { userId: auth.ctx.userId, role: "lead" },
        ...teamIds.filter((uid: string) => uid !== auth.ctx.userId).map((userId: string) => ({ userId, role: "team" as const })),
        ...clientIds.map((userId: string) => ({ userId, role: "client" as const })),
      ];
      await updateProjectMembers(auth.ctx, id, members);
    }

    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
