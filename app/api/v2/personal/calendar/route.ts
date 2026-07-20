import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { loadPersonalCalendar } from "@/lib/v2/personal/personal-calendar-repo";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  if (!YMD.test(from) || !YMD.test(to) || from > to) {
    return NextResponse.json({ error: "Valid from and to dates are required" }, { status: 400 });
  }

  try {
    const items = await loadPersonalCalendar(auth.ctx, from, to);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("personal calendar:", error);
    return NextResponse.json({ error: "Failed to load calendar" }, { status: 500 });
  }
}
