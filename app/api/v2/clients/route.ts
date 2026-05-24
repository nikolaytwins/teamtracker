import { NextRequest, NextResponse } from "next/server";
import { requireV2Session } from "@/lib/v2/auth/require-v2-session";
import { searchClients } from "@/lib/v2/clients/client-repo";

export async function GET(request: NextRequest) {
  const auth = await requireV2Session();
  if (!auth.ok) return auth.response;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json({ clients: [] });

  try {
    const clients = await searchClients(auth.ctx, q, 10);
    return NextResponse.json({ clients });
  } catch (e) {
    console.error("GET /api/v2/clients", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
