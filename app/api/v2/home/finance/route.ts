import { NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { loadHomePersonalFinance } from "@/lib/v2/home/load-home-finance";

export async function GET() {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  try {
    const payload = await loadHomePersonalFinance(auth.ctx);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error("home finance:", e);
    return NextResponse.json({ error: "Failed to load home finance" }, { status: 500 });
  }
}
