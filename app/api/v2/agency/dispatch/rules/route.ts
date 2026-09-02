import { NextResponse } from "next/server";
import { requireV2Admin } from "@/lib/v2/auth/require-v2-session";
import { getDispatchRules } from "@/lib/v2/agency/dispatch/dispatch-repo";

export async function GET() {
  const auth = await requireV2Admin();
  if (!auth.ok) return auth.response;

  try {
    const rules = await getDispatchRules();
    return NextResponse.json(rules);
  } catch (error) {
    console.error("v2/agency/dispatch/rules:", error);
    return NextResponse.json({ error: "Failed to load dispatch rules" }, { status: 500 });
  }
}
