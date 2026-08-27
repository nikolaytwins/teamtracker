import { NextRequest, NextResponse } from "next/server";
import { requireV2Personal } from "@/lib/v2/auth/require-v2-personal";
import {
  loadPersonalLifeDoc,
  PersonalLifeDocsValidationError,
  savePersonalLifeDoc,
  type LifeDocKind,
} from "@/lib/v2/personal/life-docs-repo";
import { seedBrandDoc } from "@/lib/v2/personal/seeds/brand-seed";
import { seedLifeStrategyDoc } from "@/lib/v2/personal/seeds/life-strategy-seed";
import { seedMyCodeDoc } from "@/lib/v2/personal/seeds/mycode-seed";
import { normalizeTimeDoc, seedTimeDoc } from "@/lib/v2/personal/seeds/time-seed";
import { enrichTimeDocWithFinance } from "@/lib/v2/personal/time-finance-server";
import { normalizeSportDoc, seedSportDoc } from "@/lib/v2/personal/seeds/sport-seed";

const KINDS = new Set<LifeDocKind>(["time", "brand", "life_strategy", "mycode", "sport"]);

type Ctx = { params: Promise<{ kind: string }> };

function seedFor(kind: LifeDocKind): () => Record<string, unknown> {
  switch (kind) {
    case "time":
      return seedTimeDoc as () => Record<string, unknown>;
    case "brand":
      return seedBrandDoc as () => Record<string, unknown>;
    case "life_strategy":
      return seedLifeStrategyDoc as () => Record<string, unknown>;
    case "mycode":
      return seedMyCodeDoc as () => Record<string, unknown>;
    case "sport":
      return seedSportDoc as () => Record<string, unknown>;
  }
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { kind: raw } = await params;
    if (!KINDS.has(raw as LifeDocKind)) {
      return NextResponse.json({ error: "Unknown kind" }, { status: 404 });
    }
    const kind = raw as LifeDocKind;
    const doc = await loadPersonalLifeDoc(auth.ctx, kind, seedFor(kind));
    if (kind === "time") {
      const normalized = normalizeTimeDoc(doc);
      const enriched = await enrichTimeDocWithFinance(auth.ctx, normalized);
      return NextResponse.json({ doc: enriched });
    }
    if (kind === "sport") {
      return NextResponse.json({ doc: normalizeSportDoc(doc) });
    }
    return NextResponse.json({ doc });
  } catch (e) {
    console.error("life doc get:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const auth = await requireV2Personal();
  if (!auth.ok) return auth.response;
  try {
    const { kind: raw } = await params;
    if (!KINDS.has(raw as LifeDocKind)) {
      return NextResponse.json({ error: "Unknown kind" }, { status: 404 });
    }
    const kind = raw as LifeDocKind;
    const body = await request.json();
    let doc = body.doc ?? body;
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      return NextResponse.json({ error: "doc required" }, { status: 400 });
    }
    if (kind === "time") {
      const normalized = normalizeTimeDoc(doc);
      const saved = await savePersonalLifeDoc(auth.ctx, kind, normalized);
      const enriched = await enrichTimeDocWithFinance(auth.ctx, normalizeTimeDoc(saved));
      return NextResponse.json({ doc: enriched });
    }
    if (kind === "sport") {
      const normalized = normalizeSportDoc(doc);
      const saved = await savePersonalLifeDoc(auth.ctx, kind, normalized);
      return NextResponse.json({ doc: normalizeSportDoc(saved) });
    }
    const saved = await savePersonalLifeDoc(auth.ctx, kind, doc);
    return NextResponse.json({ doc: saved });
  } catch (e) {
    if (e instanceof PersonalLifeDocsValidationError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("life doc save:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
