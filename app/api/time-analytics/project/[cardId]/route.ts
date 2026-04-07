import { NextResponse } from "next/server";
import { getProjectTimeDetail, secondsToHours } from "@/lib/time-analytics";

type Params = { params: Promise<{ cardId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { cardId } = await params;
    const detail = getProjectTimeDetail(cardId);
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      card: detail.card,
      totalSeconds: detail.totalSeconds,
      totalHours: secondsToHours(detail.totalSeconds),
      workerList: detail.workerList,
      byWorker: Object.fromEntries(
        Object.entries(detail.byWorker).map(([k, s]) => [k, { seconds: s, hours: secondsToHours(s) }])
      ),
      matrix: detail.matrix.map((row) => ({
        phaseId: row.phaseId,
        phaseTitle: row.phaseTitle,
        phaseSeconds: row.phaseSeconds,
        phaseHours: secondsToHours(row.phaseSeconds),
        byWorker: Object.fromEntries(
          Object.entries(row.byWorker).map(([w, s]) => [w, { seconds: s, hours: secondsToHours(s) }])
        ),
      })),
    });
  } catch (e) {
    console.error("time-analytics/project", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
