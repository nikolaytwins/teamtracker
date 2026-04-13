import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

function formatProfiDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { nextContactDate } = body;

    if (!nextContactDate || typeof nextContactDate !== "string") {
      return NextResponse.json({ error: "nextContactDate is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const profi = (await getAgencyRepo().getOutreachById(id, "profi")) as
      | {
          id: string;
          createdAt: string;
          cost: number;
          notes: string | null;
        }
      | undefined;
    if (!profi) {
      return NextResponse.json({ error: "Profi response not found" }, { status: 404 });
    }

    const contact = `Profi отклик (${formatProfiDate(profi.createdAt)})`;
    const source = "Profi.ru";
    const taskDescription = profi.notes
      ? `Напомнить заказчику. ${profi.notes}`
      : "Напомнить заказчику";
    const status = "new";
    const dateStr = nextContactDate.includes("T") ? nextContactDate : `${nextContactDate}T12:00:00.000Z`;
    const nextContactDateIso = new Date(dateStr).toISOString();
    const manualDateSet = 1;
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const lead = await getAgencyRepo().insertLeadFromProfiReminder({
      leadId,
      contact,
      source,
      taskDescription,
      status,
      nextContactDateIso,
      manualDateSet,
    });
    if (!lead) {
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }
    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error("Error creating reminder from profi response:", error);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
