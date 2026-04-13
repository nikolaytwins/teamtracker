import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET() {
  try {
    const expenses = await getAgencyRepo().listGeneralExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching general expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employeeName, employeeRole, amount, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount is required and must be greater than 0" }, { status: 400 });
    }

    const id = `agexp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expense = await getAgencyRepo().createGeneralExpense({
      id,
      employeeName: employeeName || null,
      employeeRole: employeeRole || null,
      amount,
      notes: notes || null,
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
