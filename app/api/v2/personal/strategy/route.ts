import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { listStrategyArticles } from "@/lib/v2/strategy/articles";
import {
  createStrategyPin,
  listStrategyPins,
} from "@/lib/v2/strategy/pins-repo";
import { isStrategyArticleTag } from "@/lib/v2/strategy/types";

export async function GET(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  try {
    const tagParam = request.nextUrl.searchParams.get("tag");
    const tag =
      tagParam && isStrategyArticleTag(tagParam) ? tagParam : ("all" as const);
    const [pins, articles] = await Promise.all([
      listStrategyPins(auth.ctx),
      Promise.resolve(listStrategyArticles(tag)),
    ]);
    return NextResponse.json({ pins, articles });
  } catch (e) {
    console.error("strategy board:", e);
    return NextResponse.json({ error: "Failed to load strategy" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const pin = await createStrategyPin(auth.ctx, {
      month_label: typeof body.monthLabel === "string" ? body.monthLabel : "",
      title: typeof body.title === "string" ? body.title : "",
    });
    return NextResponse.json({ pin });
  } catch (e) {
    console.error("strategy pin create:", e);
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json(
      { error: msg },
      { status: msg.includes("required") ? 400 : 500 }
    );
  }
}
