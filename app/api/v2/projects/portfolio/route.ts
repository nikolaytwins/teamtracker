import { NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { buildPortfolio } from "@/lib/v2/projects/build-portfolio";

export async function GET() {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  try {
    const payload = await buildPortfolio(auth.ctx);
    return NextResponse.json(payload);
  } catch (e) {
    console.error("GET /api/v2/projects/portfolio", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
