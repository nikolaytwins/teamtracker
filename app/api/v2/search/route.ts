import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { searchV2 } from "@/lib/v2/search/search";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchV2(auth.ctx, q);
  return NextResponse.json(results);
}
