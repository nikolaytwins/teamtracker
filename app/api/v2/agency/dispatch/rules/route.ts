import { NextRequest, NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { getDispatchRules, updateDispatchRules } from "@/lib/v2/agency/dispatch/dispatch-repo";
import { normalizeWorkRulesDocument } from "@/lib/v2/agency/dispatch/work-rules-document";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const rules = await getDispatchRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error("v2/agency/dispatch/rules GET:", error);
    return NextResponse.json({ error: "Failed to load dispatch rules" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { workRules?: unknown };
    if (!body.workRules) {
      return NextResponse.json({ error: "workRules required" }, { status: 400 });
    }
    const workRules = normalizeWorkRulesDocument(body.workRules);
    const rules = await updateDispatchRules({ workRules });
    return NextResponse.json(rules);
  } catch (error) {
    console.error("v2/agency/dispatch/rules PATCH:", error);
    return NextResponse.json({ error: "Failed to save dispatch rules" }, { status: 500 });
  }
}
