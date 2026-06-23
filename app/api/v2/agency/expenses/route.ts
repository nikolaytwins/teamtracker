import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepoV2, isSupabaseAgencyConfigured } from "@/lib/agency-store";
import { agencyV2NotConfiguredResponse } from "@/lib/agency-api/v2-repo";

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const expenses = await getAgencyRepoV2().listExpenses(projectId || undefined);
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseAgencyConfigured()) return agencyV2NotConfiguredResponse();
    const body = await request.json();
    const { projectId, employeeName, employeeRole, amount, notes } = body;
    const id = `exp_${Date.now()}`;
    const expense = await getAgencyRepoV2().createExpense({
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
