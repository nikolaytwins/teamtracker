import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { employeeName, employeeRole, amount, notes } = body;

    const expense = await getAgencyRepo().updateExpenseById(
      params.id,
      employeeName,
      employeeRole,
      amount,
      notes || null
    );

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    await getAgencyRepo().deleteExpenseById(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
