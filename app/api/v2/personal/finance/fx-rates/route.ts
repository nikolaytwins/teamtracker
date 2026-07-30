import { NextRequest, NextResponse } from "next/server";
import { requireV2PersonalFinance } from "@/lib/v2/auth/require-v2-personal";
import { syncFxRatesFromCbr } from "@/lib/v2/personal/fx-rates";

/** Принудительно обновить курсы ЦБ и пересчитать валютные счета. */
export async function POST(request: NextRequest) {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const force = Boolean((body as { force?: boolean }).force);
    const result = await syncFxRatesFromCbr({ force });
    return NextResponse.json(result);
  } catch (e) {
    console.error("fx rates refresh:", e);
    const msg = e instanceof Error ? e.message : "Failed to refresh FX rates";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireV2PersonalFinance();
  if (!auth.ok) return auth.response;
  try {
    const result = await syncFxRatesFromCbr();
    return NextResponse.json(result);
  } catch (e) {
    console.error("fx rates get:", e);
    const msg = e instanceof Error ? e.message : "Failed to load FX rates";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
