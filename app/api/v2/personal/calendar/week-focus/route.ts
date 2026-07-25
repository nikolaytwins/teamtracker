import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  addWeekFocusGoal,
  isWeekFocusPriority,
  loadWeekFocus,
  updateWeekFocusTitle,
} from "@/lib/v2/personal/week-focus-repo";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!YMD.test(date)) {
    return NextResponse.json({ error: "Valid date is required" }, { status: 400 });
  }

  try {
    const weekFocus = await loadWeekFocus(auth.ctx, date);
    return NextResponse.json({ weekFocus });
  } catch (error) {
    console.error("week focus get:", error);
    return NextResponse.json({ error: "Failed to load week focus" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const weekStart = typeof body.week_start === "string" ? body.week_start : "";
    if (!YMD.test(weekStart)) {
      return NextResponse.json({ error: "week_start required" }, { status: 400 });
    }

    if (typeof body.result_title === "string") {
      const weekFocus = await updateWeekFocusTitle(auth.ctx, weekStart, body.result_title);
      return NextResponse.json({ weekFocus });
    }

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const goal = await addWeekFocusGoal(
      auth.ctx,
      weekStart,
      title,
      isWeekFocusPriority(body.priority) ? body.priority : undefined
    );
    return NextResponse.json({ goal });
  } catch (error) {
    console.error("week focus post:", error);
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: msg }, { status: msg === "title required" ? 400 : 500 });
  }
}
