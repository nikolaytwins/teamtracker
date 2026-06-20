import { NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { loadPersonalTodoBootstrap } from "@/lib/v2/personal/personal-todo-repo";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const bootstrap = await loadPersonalTodoBootstrap(auth.ctx);
    return NextResponse.json(bootstrap);
  } catch (e) {
    console.error("personal todo bootstrap:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
