import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalTodoProject,
  listPersonalTodoProjects,
} from "@/lib/v2/personal/personal-todo-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const projects = await listPersonalTodoProjects(auth.ctx);
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const project = await createPersonalTodoProject(auth.ctx, {
      name,
      color: body.color,
      icon_key: body.icon_key,
    });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
