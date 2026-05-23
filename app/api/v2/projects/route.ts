import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { createProject, listProjects } from "@/lib/v2/projects/project-repo";
import type { V2ProjectScope } from "@/lib/v2/types";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const scope = request.nextUrl.searchParams.get("scope") as V2ProjectScope | null;
  const projects = await listProjects(auth.ctx, { scope: scope ?? undefined });
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

    const project = await createProject(auth.ctx, { name, scope, memberUserIds });
    return NextResponse.json({ project });
  } catch (e) {
    console.error("POST /api/v2/projects", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
