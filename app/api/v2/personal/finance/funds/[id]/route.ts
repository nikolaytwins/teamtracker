import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  PersonalFinanceValidationError,
  updatePersonalFinanceFund,
} from "@/lib/v2/personal/personal-finance-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    const item = await updatePersonalFinanceFund(auth.ctx, id, body);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof PersonalFinanceValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update fund" }, { status: 500 });
  }
}
