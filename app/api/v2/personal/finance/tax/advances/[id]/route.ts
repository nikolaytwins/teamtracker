import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalTaxAdvance,
  PersonalFinanceValidationError,
} from "@/lib/v2/personal/personal-finance-repo";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    await deletePersonalTaxAdvance(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("delete tax advance:", e);
    return NextResponse.json({ error: "Failed to delete advance" }, { status: 500 });
  }
}
