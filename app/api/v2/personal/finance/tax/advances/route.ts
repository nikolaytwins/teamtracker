import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  createPersonalTaxAdvance,
  PersonalFinanceValidationError,
} from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const advance = await createPersonalTaxAdvance(auth.ctx, {
      label: typeof body.label === "string" ? body.label : undefined,
      amount_rub: Number(body.amount_rub),
      advance_date: typeof body.advance_date === "string" ? body.advance_date : null,
      planned: Boolean(body.planned),
    });
    return NextResponse.json({ advance });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("create tax advance:", e);
    return NextResponse.json({ error: "Failed to create advance" }, { status: 500 });
  }
}
