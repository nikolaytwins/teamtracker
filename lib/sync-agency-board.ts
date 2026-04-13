import { getAgencyRepo } from "@/lib/agency-store";
import { createCard, listCards, deleteAllCards } from "@/lib/db";
import { DEFAULT_STATUS } from "@/lib/statuses";

export type SyncAgencyBoardOptions = {
  onlyMonth?: string;
  clearFirst?: boolean;
};

export type SyncAgencyBoardResult = {
  created: number;
  total: number;
  onlyMonth: string | null;
  cleared: boolean;
};

/**
 * Создаёт карточки канбана для проектов из источника агентства (SQLite или Supabase), у которых ещё нет pm_cards с тем же source_project_id.
 */
export async function syncMissingAgencyProjectsToBoard(
  options: SyncAgencyBoardOptions = {}
): Promise<SyncAgencyBoardResult> {
  const { onlyMonth, clearFirst = false } = options;

  const projects = await getAgencyRepo().listProjectsForSync();

  let toSync = projects;
  if (onlyMonth) {
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
    const existingIds = new Set(existing.map((c) => c.source_project_id).filter(Boolean) as string[]);
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

  return {
    created,
    total: toSync.length,
    onlyMonth: onlyMonth ?? null,
    cleared: clearFirst,
  };
}
