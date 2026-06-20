import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { createPersonalAccount } from "@/lib/v2/personal/personal-finance-repo";

export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const account = await createPersonalAccount(auth.ctx, body);
    return NextResponse.json({ account });
  } catch (e) {
    console.error("create personal account:", e);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
