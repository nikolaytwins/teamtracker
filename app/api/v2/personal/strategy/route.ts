import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { listStrategyArticles } from "@/lib/v2/strategy/articles";
import { isStrategyArticleTag } from "@/lib/v2/strategy/types";

export async function GET(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;

  try {
    const tagParam = request.nextUrl.searchParams.get("tag");
    const tag =
      tagParam && isStrategyArticleTag(tagParam) ? tagParam : ("all" as const);
    const articles = listStrategyArticles(tag);
    return NextResponse.json({ articles });
  } catch (e) {
    console.error("strategy board:", e);
    return NextResponse.json({ error: "Failed to load strategy" }, { status: 500 });
  }
}
