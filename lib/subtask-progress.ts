/** Минимальные поля для расчёта прогресса (сервер и клиент). */
export type SubtaskProgressInput = {
  estimated_hours: number | null;
  completed_at: string | null;
};

/** Сумма оценок часов > 0 → прогресс по часам; иначе доля выполненных подзадач. */
export function computeSubtaskProgressStats(subtasks: SubtaskProgressInput[]): {
  percent: number;
  completed: number;
  total: number;
  byHours: boolean;
} {
  const total = subtasks.length;
  if (total === 0) {
    return { percent: 0, completed: 0, total: 0, byHours: false };
  }
  const completed = subtasks.filter((s) => s.completed_at).length;
  let sumEst = 0;
  let sumEstDone = 0;
  for (const s of subtasks) {
    const h = s.estimated_hours != null && !Number.isNaN(s.estimated_hours) ? s.estimated_hours : 0;
    sumEst += h;
    if (s.completed_at) sumEstDone += h;
  }
  const byHours = sumEst > 0;
  const percent = byHours
    ? Math.min(100, Math.round((sumEstDone / sumEst) * 100))
    : Math.min(100, Math.round((completed / total) * 100));
  return { percent, completed, total, byHours };
}
