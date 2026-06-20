import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { updatePersonalTaxProfile } from "@/lib/v2/personal/personal-finance-repo";

export async function PATCH(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const tax = await updatePersonalTaxProfile(auth.ctx, body);
    return NextResponse.json({ tax });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update tax" }, { status: 500 });
  }
}
