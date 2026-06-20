import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import {
  deleteFinanceProject,
  updateFinanceProject,
} from "@/lib/v2/finance/finance-repo";
import type { V2FinancePaymentStatus, V2FinanceServiceType } from "@/lib/v2/finance/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const body = await request.json();
    const patch: Parameters<typeof updateFinanceProject>[2] = {};

    if (typeof body.name === "string") patch.name = body.name.trim();
    if (typeof body.totalAmount === "number") patch.total_amount = body.totalAmount;
    if (typeof body.paidAmount === "number") patch.paid_amount = body.paidAmount;
    if (body.status === "paid" || body.status === "prepaid" || body.status === "not_paid") {
      patch.status = body.status as V2FinancePaymentStatus;
    }
    if (
      body.serviceType === "site" ||
      body.serviceType === "presentation" ||
      body.serviceType === "small_task" ||
      body.serviceType === "subscription"
    ) {
      patch.service_type = body.serviceType as V2FinanceServiceType;
    }
    if (body.clientType === null || typeof body.clientType === "string") patch.client_type = body.clientType;
    if (body.paymentMethod === null || body.paymentMethod === "card" || body.paymentMethod === "account") {
      patch.payment_method = body.paymentMethod;
    }
    if (body.clientContact === null || typeof body.clientContact === "string") {
      patch.client_contact = body.clientContact;
    }

    const project = await updateFinanceProject(auth.ctx, id, patch);
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ project });
  } catch (e) {
    console.error("v2 finance update project:", e);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    await deleteFinanceProject(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("v2 finance delete project:", e);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
