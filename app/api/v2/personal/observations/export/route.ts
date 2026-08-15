import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { isObservationType } from "@/lib/v2/personal/observations-meta";
import {
  exportPersonalObservations,
  formatObservationsExportMarkdown,
  type ObservationListFilter,
} from "@/lib/v2/personal/personal-observations-repo";

function parseFilter(request: NextRequest): ObservationListFilter {
  const sp = request.nextUrl.searchParams;
  const typeRaw = sp.get("type");
  const type =
    typeRaw && typeRaw !== "all" && isObservationType(typeRaw) ? typeRaw : "all";
  return {
    type,
    linkKey: sp.get("link") || "all",
    tag: sp.get("tag"),
    q: sp.get("q") || "",
    from: sp.get("from"),
    to: sp.get("to"),
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const format = request.nextUrl.searchParams.get("format") || "md";
    const filter = parseFilter(request);
    const payload = await exportPersonalObservations(auth.ctx, filter);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "json" || format === "jsonl") {
      if (format === "jsonl") {
        const body = payload.items.map((it) => JSON.stringify(it)).join("\n") + "\n";
        return new NextResponse(body, {
          headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Content-Disposition": `attachment; filename="observations-${stamp}.jsonl"`,
          },
        });
      }
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="observations-${stamp}.json"`,
        },
      });
    }

    const md = formatObservationsExportMarkdown(payload);
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="observations-${stamp}.md"`,
      },
    });
  } catch (e) {
    console.error("personal observations export:", e);
    return NextResponse.json({ error: "Failed to export observations" }, { status: 500 });
  }
}
