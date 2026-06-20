import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  copyFinanceGeneralExpensesFromMonth,
  createFinanceGeneralExpense,
  deleteFinanceGeneralExpense,
} from "@/lib/v2/finance/finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const employeeName = typeof body.employeeName === "string" ? body.employeeName.trim() : "";
    const employeeRole = typeof body.employeeRole === "string" ? body.employeeRole.trim() : "";
    const amount = typeof body.amount === "number" ? body.amount : NaN;
    if (!employeeName || !employeeRole || !Number.isFinite(amount)) {
      return NextResponse.json({ error: "employeeName, employeeRole, amount required" }, { status: 400 });
    }

    const expense = await createFinanceGeneralExpense(auth.ctx, {
      employeeName,
      employeeRole,
      amount,
      notes: typeof body.notes === "string" ? body.notes : null,
      year: typeof body.year === "number" ? body.year : undefined,
      month: typeof body.month === "number" ? body.month : undefined,
    });

    return NextResponse.json({ expense });
  } catch (e) {
    console.error("v2 finance create general expense:", e);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await deleteFinanceGeneralExpense(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("v2 finance delete general expense:", e);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const fromYear = Number(body.fromYear);
    const fromMonth = Number(body.fromMonth);
    const toYear = Number(body.toYear);
    const toMonth = Number(body.toMonth);
    if (![fromYear, fromMonth, toYear, toMonth].every(Number.isFinite)) {
      return NextResponse.json({ error: "fromYear, fromMonth, toYear, toMonth required" }, { status: 400 });
    }
    const copied = await copyFinanceGeneralExpensesFromMonth(
      auth.ctx,
      fromYear,
      fromMonth,
      toYear,
      toMonth
    );
    return NextResponse.json({ copied });
  } catch (e) {
    console.error("v2 finance copy general expenses:", e);
    return NextResponse.json({ error: "Failed to copy expenses" }, { status: 500 });
  }
}
