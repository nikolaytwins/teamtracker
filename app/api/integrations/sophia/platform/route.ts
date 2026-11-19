import { NextRequest, NextResponse } from "next/server";
import { sophiaCorsHeaders } from "@/lib/v2/integrations/sophia-cors";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";
import {
  listPlatformSections,
  PlatformReaderError,
  readPlatformSection,
} from "@/lib/v2/integrations/platform-reader";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...sophiaCorsHeaders } });
}

/**
 * Чтение разделов Team Tracker для MCP / ChatGPT.
 * Query:
 *   list=1 — каталог вкладок
 *   section=<id> — текст раздела
 *   q, id, slug, type, from, to, year, month, limit — фильтры
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveSophiaIntegrationContext();
    const sp = request.nextUrl.searchParams;
    const section = sp.get("section")?.trim() || "";

    if (!section || sp.get("list") === "1" || sp.get("sections") === "1") {
      return NextResponse.json(
        {
          ok: true,
          sections: listPlatformSections(),
          hint: section
            ? undefined
            : "Передай section=<id>, например section=hypotheses. Дополнительно: list=1.",
        },
        { headers: { ...sophiaCorsHeaders } },
      );
    }

    const yearRaw = Number(sp.get("year"));
    const monthRaw = Number(sp.get("month"));
    const limitRaw = Number(sp.get("limit"));
    const result = await readPlatformSection(ctx, {
      section,
      q: sp.get("q") || undefined,
      id: sp.get("id") || undefined,
      slug: sp.get("slug") || undefined,
      type: sp.get("type") || undefined,
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      year: Number.isFinite(yearRaw) ? yearRaw : undefined,
      month: Number.isFinite(monthRaw) ? monthRaw : undefined,
      limit: Number.isFinite(limitRaw) ? limitRaw : undefined,
    });

    return NextResponse.json({ ok: true, ...result }, { headers: { ...sophiaCorsHeaders } });
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: { ...sophiaCorsHeaders } },
      );
    }
    if (error instanceof PlatformReaderError) {
      return NextResponse.json(
        { error: error.message, sections: listPlatformSections() },
        { status: 400, headers: { ...sophiaCorsHeaders } },
      );
    }
    console.error("integrations/sophia/platform GET:", error);
    return NextResponse.json(
      { error: "Failed to read platform section" },
      { status: 500, headers: { ...sophiaCorsHeaders } },
    );
  }
}
