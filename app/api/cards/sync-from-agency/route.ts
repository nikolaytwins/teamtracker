import { NextResponse } from "next/server";
import { syncMissingAgencyProjectsToBoard } from "@/lib/sync-agency-board";

/** Body: { onlyMonth?: "2025-03" | "2026-03", clearFirst?: boolean } — только проекты, созданные в этом месяце (страница месяца в Agency); clearFirst — сначала очистить канбан. */
export async function POST(request: Request) {
  try {
    let onlyMonth: string | undefined;
    let clearFirst = false;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        onlyMonth = typeof body.onlyMonth === "string" ? body.onlyMonth : undefined;
        clearFirst = Boolean(body.clearFirst);
      }
    } catch {
      /* no body */
    }

    const result = syncMissingAgencyProjectsToBoard({ onlyMonth, clearFirst });
    return NextResponse.json({
      success: true,
      created: result.created,
      total: result.total,
      onlyMonth: result.onlyMonth,
      cleared: result.cleared,
    });
  } catch (e) {
    console.error("sync-from-agency", e);
    return NextResponse.json({ error: "Не удалось подтянуть проекты" }, { status: 500 });
  }
}
