import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const employeeName = body.employeeName != null ? String(body.employeeName) : null;
    const employeeRole = body.employeeRole != null ? String(body.employeeRole) : null;
    const amount = body.amount != null ? Number(body.amount) : undefined;
    const notes = body.notes != null ? String(body.notes) : null;

    const repo = getAgencyRepo();
    const existing = await repo.getGeneralExpenseById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const finalAmount = amount != null ? amount : Number(existing.amount);
    const finalName = employeeName != null ? employeeName : String(existing.employeeName);
    const finalRole = employeeRole != null ? employeeRole : String(existing.employeeRole);
    const finalNotes = notes != null ? notes : (existing.notes as string | null);

    const expense = await repo.updateGeneralExpenseById(
      params.id,
      finalName,
      finalRole,
      finalAmount,
      finalNotes
    );
    return NextResponse.json({ success: true, expense });
  } catch (error: unknown) {
    console.error("Error updating general expense:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to update expense", details: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    await getAgencyRepo().deleteGeneralExpenseById(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
