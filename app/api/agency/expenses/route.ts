import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const expenses = await getAgencyRepo().listExpenses(projectId || undefined);
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, employeeName, employeeRole, amount, notes } = body;
    const id = `exp_${Date.now()}`;
    const expense = await getAgencyRepo().createExpense({
      id,
      projectId,
      employeeName,
      employeeRole,
      amount,
      notes: notes || null,
    });
    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
