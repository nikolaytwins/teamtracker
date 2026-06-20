import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { createPersonalTodo, getPersonalTodoProject, loadPersonalTodoList } from "@/lib/v2/personal/personal-todo-repo";
import type { PersonalTodoView } from "@/lib/v2/personal/todo-types";

const VIEWS: PersonalTodoView[] = ["inbox", "today", "upcoming", "week", "project", "completed"];

export async function GET(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  const view = (request.nextUrl.searchParams.get("view") ?? "today") as PersonalTodoView;
  if (!VIEWS.includes(view)) {
    return NextResponse.json({ error: "Invalid view" }, { status: 400 });
  }
  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
  try {
    if (view === "project") {
      if (!projectId) {
        return NextResponse.json({ error: "projectId required" }, { status: 400 });
      }
      const project = await getPersonalTodoProject(auth.ctx, projectId);
      if (!project || project.is_inbox) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }
    const payload = await loadPersonalTodoList(auth.ctx, view, { projectId });
    return NextResponse.json(payload);
  } catch (e) {
    console.error("personal todos list:", e);
    return NextResponse.json({ error: "Failed to load todos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const todo = await createPersonalTodo(auth.ctx, {
      title,
      project_id: body.project_id ?? null,
      parent_id: body.parent_id ?? null,
      description: body.description ?? null,
      priority: body.priority,
      due_date: body.due_date ?? null,
      due_time: body.due_time ?? null,
      scheduled_date: body.scheduled_date ?? null,
    });
    return NextResponse.json({ todo });
  } catch (e) {
    console.error("create personal todo:", e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
