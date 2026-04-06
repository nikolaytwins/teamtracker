import Database from "better-sqlite3";
import { NextResponse } from "next/server";
import { getAgencySqlitePath } from "@/lib/agency-sqlite";
import { createCard, listCards, deleteAllCards } from "@/lib/db";
import { DEFAULT_STATUS } from "@/lib/statuses";

/** Body: { onlyMonth?: "2025-03" | "2026-03", clearFirst?: boolean } — только проекты, созданные в этом месяце (страница месяца в Agency); clearFirst — сначала очистить канбан. */
export async function POST(request: Request) {
  try {
    let onlyMonth: string | undefined;
    let clearFirst = false;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        onlyMonth = typeof body.onlyMonth === "string" ? body.onlyMonth : undefined;
        clearFirst = Boolean(body.clearFirst);
      }
    } catch {
      /* no body */
    }

    const db = new Database(getAgencySqlitePath());
    const projects = db
      .prepare(
        `SELECT id, name, deadline, createdAt FROM AgencyProject ORDER BY createdAt DESC`
      )
      .all() as { id: string; name: string; deadline: string | null; createdAt?: string }[];
    db.close();

    let toSync = projects;
    if (onlyMonth) {
      // Проекты, созданные в указанном месяце (как на странице месяца в Agency), не по дедлайну
      const [y, m] = onlyMonth.split("-").map(Number);
      if (y && m) {
        const monthStart = new Date(y, m - 1, 1);
        const monthEnd = new Date(y, m, 0, 23, 59, 59);
        toSync = projects.filter((p) => {
          const created = p.createdAt ? new Date(p.createdAt) : null;
          return created && created >= monthStart && created <= monthEnd;
        });
      }
    }

    if (clearFirst) {
      deleteAllCards();
    } else {
      const existing = listCards();
      const existingIds = new Set(existing.map((c) => c.source_project_id).filter(Boolean));
      toSync = toSync.filter((p) => !existingIds.has(p.id));
    }

    let created = 0;
    for (const p of toSync) {
      createCard({
        source_project_id: p.id,
        name: p.name,
        deadline: p.deadline ?? null,
        status: DEFAULT_STATUS,
      });
      created++;
    }

    return NextResponse.json({
      success: true,
      created,
      total: toSync.length,
      onlyMonth: onlyMonth ?? null,
      cleared: clearFirst,
    });
  } catch (e) {
    console.error("sync-from-agency", e);
    return NextResponse.json({ error: "Не удалось подтянуть проекты" }, { status: 500 });
  }
}
