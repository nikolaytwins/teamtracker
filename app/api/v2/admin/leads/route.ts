import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { createLead, listLeads } from "@/lib/v2/leads/lead-repo";
import { isV2LeadStatus, isV2LeadType } from "@/lib/v2/leads/lead-types";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;
  try {
    const leads = await listLeads(auth.ctx);
    return NextResponse.json({ leads });
  } catch (e) {
    console.error("GET /api/v2/admin/leads", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const lead = await createLead(auth.ctx, {
      name,
      contact: typeof body.contact === "string" ? body.contact : "",
      comment: typeof body.comment === "string" ? body.comment : body.comment === null ? null : undefined,
      leadType: isV2LeadType(body.leadType) ? body.leadType : undefined,
      status: isV2LeadStatus(body.status) ? body.status : undefined,
      reminderAt: typeof body.reminderAt === "string" ? body.reminderAt : body.reminderAt === null ? null : undefined,
      estimatedAmount:
        body.estimatedAmount === null
          ? null
          : typeof body.estimatedAmount === "number"
            ? body.estimatedAmount
            : undefined,
    });
    return NextResponse.json({ lead });
  } catch (e) {
    console.error("POST /api/v2/admin/leads", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
