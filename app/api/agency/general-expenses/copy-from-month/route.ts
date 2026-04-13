import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

/** Скопировать общие расходы с одного месяца на другой (дубликаты с новой датой) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fromYear = Number(body.fromYear);
    const fromMonth = Number(body.fromMonth);
    const toYear = Number(body.toYear);
    const toMonth = Number(body.toMonth);

    if (!fromYear || !fromMonth || !toYear || !toMonth || fromMonth < 1 || fromMonth > 12 || toMonth < 1 || toMonth > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const copied = await getAgencyRepo().copyGeneralExpensesBetweenMonths({
      fromYear,
      fromMonth,
      toYear,
      toMonth,
    });
    return NextResponse.json({ success: true, copied });
  } catch (error: unknown) {
    console.error("Error copying general expenses:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to copy expenses", details: message }, { status: 500 });
  }
}
