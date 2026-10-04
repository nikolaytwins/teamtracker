import { NextRequest, NextResponse } from "next/server";
import { getAgencyRepo } from "@/lib/agency-store";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { title, quantity, unitPrice, order, billingType, trackedSeconds, timerStartedAt, totalOverrideRub } =
      body;

    const repo = getAgencyRepo();
    await repo.ensureProjectDetailTable();

    const existing = await repo.getProjectDetailById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Detail not found" }, { status: 404 });
    }

    const nextTitle = title != null ? String(title) : existing.title;
    const qRaw = quantity != null ? quantity : existing.quantity;
    const pRaw = unitPrice != null ? unitPrice : existing.unitPrice;

    const numericQuantity = typeof qRaw === "number" ? qRaw : parseFloat(String(qRaw));
    const numericUnitPrice = typeof pRaw === "number" ? pRaw : parseFloat(String(pRaw));

    const nextOrder =
      typeof order === "number" ? order : typeof existing.order === "number" ? existing.order : 0;

    const nextBilling =
      billingType === "hourly" || billingType === "fixed" ? billingType : existing.billingType;

    const extras: {
      billingType?: "fixed" | "hourly";
      trackedSeconds?: number;
      timerStartedAt?: string | null;
      totalOverrideRub?: number | null;
    } = { billingType: nextBilling };
    if (trackedSeconds != null) {
      const n = typeof trackedSeconds === "number" ? trackedSeconds : parseFloat(String(trackedSeconds));
      if (!Number.isNaN(n)) extras.trackedSeconds = n;
    }
    if (timerStartedAt === null) extras.timerStartedAt = null;
    else if (typeof timerStartedAt === "string") extras.timerStartedAt = timerStartedAt;
    if (totalOverrideRub === null || totalOverrideRub === "") {
      extras.totalOverrideRub = null;
    } else if (totalOverrideRub != null) {
      const n =
        typeof totalOverrideRub === "number"
          ? totalOverrideRub
          : parseFloat(String(totalOverrideRub).replace(/\s/g, "").replace(",", "."));
      if (!Number.isNaN(n)) extras.totalOverrideRub = n;
    }

    const detail = await repo.updateProjectDetailById(
      params.id,
      nextTitle,
      Number.isNaN(numericQuantity) ? existing.quantity : numericQuantity,
      Number.isNaN(numericUnitPrice) ? existing.unitPrice : numericUnitPrice,
      nextOrder,
      extras
    );

    return NextResponse.json({ success: true, detail });
  } catch (error) {
    console.error("Error updating project detail:", error);
    return NextResponse.json({ error: "Failed to update project detail" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const repo = getAgencyRepo();
    await repo.ensureProjectDetailTable();
    await repo.deleteProjectDetailById(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project detail:", error);
    return NextResponse.json({ error: "Failed to delete project detail" }, { status: 500 });
  }
}
