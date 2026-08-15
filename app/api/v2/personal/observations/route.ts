import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import { isObservationType } from "@/lib/v2/personal/observations-meta";
import {
  createPersonalObservation,
  loadPersonalObservationsBoard,
  PersonalObservationsValidationError,
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
    const board = await loadPersonalObservationsBoard(auth.ctx, parseFilter(request));
    return NextResponse.json(board);
  } catch (e) {
    console.error("personal observations list:", e);
    return NextResponse.json({ error: "Failed to load observations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const observation = await createPersonalObservation(auth.ctx, {
      type: body.type,
      title: body.title,
      body: body.body,
      why: body.why,
      linkKey: body.linkKey ?? body.link ?? null,
      tagNames: Array.isArray(body.tagNames)
        ? body.tagNames.map(String)
        : Array.isArray(body.tags)
          ? body.tags.map(String)
          : undefined,
      observedAt: body.observedAt ?? null,
    });
    return NextResponse.json({ observation });
  } catch (e) {
    if (e instanceof PersonalObservationsValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("personal observations create:", e);
    return NextResponse.json({ error: "Failed to create observation" }, { status: 500 });
  }
}
