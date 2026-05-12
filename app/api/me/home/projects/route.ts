import { NextResponse } from "next/server";
import { listHomeTimerProjectCards } from "@/lib/home-timer-projects";
import { requireSessionRole } from "@/lib/require-role";

export async function GET() {
  try {
    const auth = await requireSessionRole();
    if (!auth.ok) return auth.response;
    const cards = listHomeTimerProjectCards(auth.role, auth.session.sub);
    return NextResponse.json({ cards });
  } catch (e) {
    console.error("GET /api/me/home/projects", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
