import { NextRequest, NextResponse } from "next/server";
import { deleteProjectTemplate, getProjectTemplate, updateProjectTemplate } from "@/lib/pm-project-templates";
import { getServerSession } from "@/lib/get-session";
import { isMemberRestrictedRole } from "@/lib/roles";
import { effectiveUserRole, requireSessionRole } from "@/lib/require-role";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const tid = typeof id === "string" ? id.trim() : "";
    const tpl = getProjectTemplate(tid);
    if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ template: tpl });
  } catch (e) {
    console.error("GET /api/board/project-templates/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const tid = typeof id === "string" ? id.trim() : "";
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name : undefined;
    let items: { title: string; estimatedHours?: number | null }[] | undefined;
    if (Array.isArray(body.items)) {
      items = body.items
        .map((x: unknown) => {
          if (!x || typeof x !== "object") return null;
          const o = x as Record<string, unknown>;
          const t = typeof o.title === "string" ? o.title.trim() : "";
          if (!t) return null;
          const eh =
            typeof o.estimatedHours === "number" && !Number.isNaN(o.estimatedHours) ? o.estimatedHours : null;
          return { title: t, estimatedHours: eh };
        })
        .filter(Boolean) as { title: string; estimatedHours: number | null }[];
    }
    const tpl = updateProjectTemplate(tid, { name, items });
    if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ template: tpl });
  } catch (e) {
    console.error("PATCH /api/board/project-templates/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const tid = typeof id === "string" ? id.trim() : "";
    const ok = deleteProjectTemplate(tid);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/board/project-templates/[id]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
