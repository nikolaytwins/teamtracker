import { NextRequest, NextResponse } from "next/server";
import { createProjectTemplate, listProjectTemplates } from "@/lib/pm-project-templates";
import { requireSessionRole } from "@/lib/require-role";
import { isMemberRestrictedRole } from "@/lib/roles";
import { effectiveUserRole } from "@/lib/require-role";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const list = listProjectTemplates();
    return NextResponse.json({ templates: list });
  } catch (e) {
    console.error("GET /api/board/project-templates", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isMemberRestrictedRole(effectiveUserRole(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems
      .map((x: unknown) => {
        if (!x || typeof x !== "object") return null;
        const o = x as Record<string, unknown>;
        const title = typeof o.title === "string" ? o.title.trim() : "";
        if (!title) return null;
        const eh =
          typeof o.estimatedHours === "number" && !Number.isNaN(o.estimatedHours) ? o.estimatedHours : null;
        return { title, estimatedHours: eh };
      })
      .filter(Boolean) as { title: string; estimatedHours: number | null }[];
    const tpl = createProjectTemplate({ name, items });
    return NextResponse.json({ template: tpl });
  } catch (e) {
    console.error("POST /api/board/project-templates", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
