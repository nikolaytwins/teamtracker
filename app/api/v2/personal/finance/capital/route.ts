import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { createPersonalCapital } from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const item = await createPersonalCapital(auth.ctx, body);
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create capital item" }, { status: 500 });
  }
}
