import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";

export async function GET() {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const expenses = await getAgencyRepoV2().listGeneralExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching general expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const body = await request.json();
    const { employeeName, employeeRole, amount, notes, year, month } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount is required and must be greater than 0" }, { status: 400 });
    }

    const parsedYear = year != null ? Number(year) : undefined;
    const parsedMonth = month != null ? Number(month) : undefined;
    if (
      (parsedYear != null && (!parsedYear || parsedYear < 2000 || parsedYear > 2100)) ||
      (parsedMonth != null && (!parsedMonth || parsedMonth < 1 || parsedMonth > 12))
    ) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    const id = `agexp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expense = await getAgencyRepoV2().createGeneralExpense({
      id,
      employeeName: employeeName || null,
      employeeRole: employeeRole || null,
      amount,
      notes: notes || null,
      year: parsedYear,
      month: parsedMonth,
    });

    return NextResponse.json({ success: true, expense }, { status: 200 });
  } catch (error) {
    console.error("Error creating general expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
