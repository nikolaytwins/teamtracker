import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { createFinanceProject } from "@/lib/v2/finance/finance-repo";
import type { V2FinancePaymentStatus, V2FinanceServiceType } from "@/lib/v2/finance/types";

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const serviceType = body.serviceType as V2FinanceServiceType | undefined;
    const status = body.status as V2FinancePaymentStatus | undefined;
    const year = typeof body.year === "number" ? body.year : undefined;
    const month = typeof body.month === "number" ? body.month : undefined;

    const project = await createFinanceProject(auth.ctx, {
      name,
      totalAmount: typeof body.totalAmount === "number" ? body.totalAmount : 0,
      paidAmount: typeof body.paidAmount === "number" ? body.paidAmount : 0,
      status,
      serviceType,
      clientType: typeof body.clientType === "string" ? body.clientType : null,
      paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : null,
      clientContact: typeof body.clientContact === "string" ? body.clientContact : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      year,
      month,
    });

    return NextResponse.json({ project });
  } catch (e) {
    console.error("v2 finance create project:", e);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
