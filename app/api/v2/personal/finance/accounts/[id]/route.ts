import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import {
  deletePersonalAccount,
  updatePersonalAccount,
} from "@/lib/v2/personal/personal-finance-repo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json();
    const account = await updatePersonalAccount(auth.ctx, id, body);
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ account });
  } catch (e) {
    console.error("update personal account:", e);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await deletePersonalAccount(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("delete personal account:", e);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
