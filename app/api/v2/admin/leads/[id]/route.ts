import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { archiveLead, updateLead } from "@/lib/v2/leads/lead-repo";
import { isV2LeadSource, isV2LeadStatus, isV2LeadType } from "@/lib/v2/leads/lead-types";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const lead = await updateLead(auth.ctx, id, {
      name: typeof body.name === "string" ? body.name : undefined,
      contact: typeof body.contact === "string" ? body.contact : undefined,
      comment:
        body.comment === null ? null : typeof body.comment === "string" ? body.comment : undefined,
      leadType: isV2LeadType(body.leadType) ? body.leadType : undefined,
      status: isV2LeadStatus(body.status) ? body.status : undefined,
      reminderAt:
        body.reminderAt === null
          ? null
          : typeof body.reminderAt === "string"
            ? body.reminderAt
            : undefined,
      estimatedAmount:
        body.estimatedAmount === null
          ? null
          : typeof body.estimatedAmount === "number"
            ? body.estimatedAmount
            : undefined,
      source: isV2LeadSource(body.source) ? body.source : undefined,
      sourceCustom:
        body.sourceCustom === null
          ? null
          : typeof body.sourceCustom === "string"
            ? body.sourceCustom
            : undefined,
      takenIntoWorkAt:
        body.takenIntoWorkAt === null
          ? null
          : typeof body.takenIntoWorkAt === "string"
            ? body.takenIntoWorkAt
            : undefined,
      lostReason:
        body.lostReason === null
          ? null
          : typeof body.lostReason === "string"
            ? body.lostReason
            : undefined,
      lostAt:
        body.lostAt === null
          ? null
          : typeof body.lostAt === "string"
            ? body.lostAt
            : undefined,
      createdAt: typeof body.createdAt === "string" ? body.createdAt : undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    });
    return NextResponse.json({ lead });
  } catch (e) {
    console.error("PATCH /api/v2/admin/leads/[id]", e);
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Lead not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteCtx) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  try {
    await archiveLead(auth.ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/v2/admin/leads/[id]", e);
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Lead not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
