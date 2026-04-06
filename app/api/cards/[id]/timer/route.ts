import { NextRequest, NextResponse } from "next/server";
import { buildCardPhasesPayload, startTimer, stopTimer } from "@/lib/pm-phases";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const action = body?.action as string;
    if (action === "stop") {
      const entry = stopTimer(id);
      return NextResponse.json({
        success: true,
        entry,
        payload: buildCardPhasesPayload(id),
      });
    }
    if (action === "start") {
      const phaseId = typeof body.phaseId === "string" ? body.phaseId : "";
      if (!phaseId) return NextResponse.json({ error: "phaseId required" }, { status: 400 });
      const result = startTimer(id, phaseId);
      if (!result) return NextResponse.json({ error: "Invalid card or phase" }, { status: 400 });
      return NextResponse.json({
        success: true,
        ...result,
        payload: buildCardPhasesPayload(id),
      });
    }
    return NextResponse.json({ error: "action must be start or stop" }, { status: 400 });
  } catch (e) {
    console.error("POST timer", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
