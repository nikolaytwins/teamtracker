import { NextRequest, NextResponse } from "next/server";
import { parseDiaryMessage } from "@/lib/v2/integrations/parse-diary-message";
import {
  mergeResolvedDiaryTags,
  resolveDiaryTagNames,
} from "@/lib/v2/integrations/resolve-diary-tags";
import {
  resolveSophiaIntegrationContext,
  SophiaIntegrationConfigError,
} from "@/lib/v2/integrations/sophia-integration-context";
import { isObservationType } from "@/lib/v2/personal/observations-meta";
import {
  createPersonalObservation,
  getPersonalObservation,
  loadPersonalObservationsBoard,
  PersonalObservationsValidationError,
} from "@/lib/v2/personal/personal-observations-repo";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "x-tt-integration-secret, Authorization, Content-Type",
} as const;

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...corsHeaders } });
}

/**
 * Чтение дневника для MCP / Sophia.
 * Query: id | q, from, to, tag, type, limit
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveSophiaIntegrationContext();
    const sp = request.nextUrl.searchParams;
    if (sp.get("tags") === "1" || sp.get("list") === "tags") {
      const board = await loadPersonalObservationsBoard(ctx, { type: "all" });
      return NextResponse.json(
        { ok: true, tags: board.tags },
        { headers: { ...corsHeaders } }
      );
    }
    const id = sp.get("id")?.trim();
    if (id) {
      const observation = await getPersonalObservation(ctx, id);
      if (!observation) {
        return NextResponse.json({ error: "Запись не найдена" }, { status: 404, headers: { ...corsHeaders } });
      }
      return NextResponse.json({ ok: true, observation }, { headers: { ...corsHeaders } });
    }

    const typeRaw = sp.get("type");
    const type =
      typeRaw && typeRaw !== "all" && isObservationType(typeRaw) ? typeRaw : "all";
    const limitRaw = Number(sp.get("limit") ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw)))
      : DEFAULT_LIMIT;

    const board = await loadPersonalObservationsBoard(ctx, {
      type,
      tag: sp.get("tag"),
      q: sp.get("q") || "",
      from: sp.get("from"),
      to: sp.get("to"),
    });
    return NextResponse.json(
      {
        ok: true,
        total: board.observations.length,
        observations: board.observations.slice(0, limit),
        tags: board.tags.slice(0, 40),
        counts: board.counts,
      },
      { headers: { ...corsHeaders } }
    );
  } catch (error) {
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: { ...corsHeaders } });
    }
    console.error("integrations/sophia/diary GET:", error);
    return NextResponse.json(
      { error: "Failed to load diary" },
      { status: 500, headers: { ...corsHeaders } }
    );
  }
}

/**
 * Запись в личный дневник из Sophia (Telegram).
 * Доступ: x-tt-integration-secret = TT_INTEGRATION_SECRET (мин. 16 символов).
 *
 * Body: { "message": "..." } | { "body", "tags" | "tagHints", "preferExistingTags"?, "allowNewTags"? }
 * tagHints сопоставляются с существующими тегами (в т.ч. с эмодzi). По умолчанию новые теги не создаются.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawMessage =
      typeof body.message === "string"
        ? body.message
        : typeof body.body === "string"
          ? body.body
          : "";

    const parsed = parseDiaryMessage(rawMessage);
    const explicitTags = Array.isArray(body.tags)
      ? body.tags.map(String)
      : Array.isArray(body.tagNames)
        ? body.tagNames.map(String)
        : [];
    const tagHints = Array.isArray(body.tagHints)
      ? body.tagHints.map(String)
      : typeof body.tagHint === "string"
        ? [body.tagHint]
        : [];

    const ctx = await resolveSophiaIntegrationContext();
    const board = await loadPersonalObservationsBoard(ctx, { type: "all" });

    const preferExisting = body.preferExistingTags !== false;
    const allowNew = body.allowNewTags === true;

    const rawTagInputs = [
      ...parsed.tagNames,
      ...explicitTags.map((t: string) => t.replace(/^#/, "")),
      ...tagHints.map((t: string) => t.replace(/^#/, "")),
    ];

    const resolution = resolveDiaryTagNames(rawTagInputs, board.tags);
    let tagNames = resolution.resolved;

    if (resolution.ambiguous.length) {
      return NextResponse.json(
        {
          error: "Неоднозначный тег — уточни",
          ambiguous: resolution.ambiguous,
          tags: board.tags.slice(0, 30),
        },
        { status: 409, headers: { ...corsHeaders } }
      );
    }

    if (resolution.unmatched.length) {
      if (allowNew) {
        tagNames = mergeResolvedDiaryTags(tagNames, resolution.unmatched);
      } else if (preferExisting) {
        return NextResponse.json(
          {
            error: "Не нашла подходящий существующий тег",
            unmatched: resolution.unmatched,
            tags: board.tags.slice(0, 30),
          },
          { status: 400, headers: { ...corsHeaders } }
        );
      } else {
        tagNames = mergeResolvedDiaryTags(tagNames, resolution.unmatched);
      }
    }

    tagNames = [...new Set(tagNames)];

    const observationBody = String(body.body ?? parsed.body ?? rawMessage).trim();
    if (!observationBody) {
      return NextResponse.json(
        { error: "Пустое сообщение" },
        { status: 400, headers: { ...corsHeaders } }
      );
    }

    const observation = await createPersonalObservation(ctx, {
      type: typeof body.type === "string" ? body.type : "other",
      title: typeof body.title === "string" ? body.title : undefined,
      body: observationBody,
      why: typeof body.why === "string" ? body.why : undefined,
      linkKey: body.linkKey ?? body.link ?? null,
      tagNames,
      observedAt: body.observedAt ?? null,
    });

    return NextResponse.json({ ok: true, observation }, { headers: { ...corsHeaders } });
  } catch (error) {
    if (error instanceof PersonalObservationsValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: { ...corsHeaders } });
    }
    if (error instanceof SophiaIntegrationConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: { ...corsHeaders } });
    }
    console.error("integrations/sophia/diary:", error);
    return NextResponse.json(
      { error: "Failed to create diary entry" },
      { status: 500, headers: { ...corsHeaders } }
    );
  }
}
