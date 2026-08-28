import type { HomeMonth, HomeSeasonTask } from "@/lib/v2/personal/seeds/home-seed";

const STORAGE_KEY = "v2-home-season-v1";

export type SeasonCustomTask = {
  id: string;
  monthId: string;
  text: string;
  href?: string;
};

export type SeasonStorageState = {
  /** taskId → monthId (если перенесли drag-and-drop) */
  taskMonth: Record<string, string>;
  /** порядок taskId внутри каждого месяца */
  taskOrder: Record<string, string[]>;
  /** taskId → done */
  taskDone: Record<string, boolean>;
  /** скрытые пользователем плашки */
  taskHidden: string[];
  /** пользовательские карточки */
  customTasks: SeasonCustomTask[];
};

function emptyState(): SeasonStorageState {
  return { taskMonth: {}, taskOrder: {}, taskDone: {}, taskHidden: [], customTasks: [] };
}

export function readSeasonStorage(): SeasonStorageState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<SeasonStorageState>;
    return {
      taskMonth: parsed.taskMonth ?? {},
      taskOrder: parsed.taskOrder ?? {},
      taskDone: parsed.taskDone ?? {},
      taskHidden: parsed.taskHidden ?? [],
      customTasks: parsed.customTasks ?? [],
    };
  } catch {
    return emptyState();
  }
}

export function writeSeasonStorage(state: SeasonStorageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Собирает задачи по месяцам с учётом localStorage (переносы, порядок, done). */
export function buildSeasonMonths(
  seed: HomeMonth[],
  storage: SeasonStorageState
): Array<Omit<HomeMonth, "tasks"> & { tasks: Array<HomeSeasonTask & { done: boolean }> }> {
  const allTasks = new Map<string, HomeSeasonTask & { defaultMonthId: string }>();
  for (const m of seed) {
    for (const t of m.tasks) {
      allTasks.set(t.id, { ...t, defaultMonthId: m.id });
    }
  }

  const byMonth = new Map<string, Array<HomeSeasonTask & { done: boolean }>>();
  for (const m of seed) byMonth.set(m.id, []);

  for (const [taskId, task] of allTasks) {
    if (storage.taskHidden.includes(taskId)) continue;
    const monthId = storage.taskMonth[taskId] ?? task.defaultMonthId;
    const list = byMonth.get(monthId) ?? [];
    list.push({ ...task, done: Boolean(storage.taskDone[taskId]) });
    byMonth.set(monthId, list);
  }

  for (const custom of storage.customTasks ?? []) {
    if (storage.taskHidden.includes(custom.id)) continue;
    const monthId = storage.taskMonth[custom.id] ?? custom.monthId;
    const list = byMonth.get(monthId) ?? [];
    list.push({
      id: custom.id,
      text: custom.text,
      href: custom.href,
      done: Boolean(storage.taskDone[custom.id]),
    });
    byMonth.set(monthId, list);
  }

  return seed.map((m) => {
    const items = byMonth.get(m.id) ?? [];
    const order = storage.taskOrder[m.id];
    if (order?.length) {
      const byId = new Map(items.map((t) => [t.id, t]));
      const sorted: Array<HomeSeasonTask & { done: boolean }> = [];
      for (const id of order) {
        const t = byId.get(id);
        if (t) {
          sorted.push(t);
          byId.delete(id);
        }
      }
      for (const t of byId.values()) sorted.push(t);
      return { ...m, tasks: sorted };
    }
    return { ...m, tasks: items };
  });
}

export function toggleSeasonTaskDone(taskId: string, done: boolean): SeasonStorageState {
  const storage = readSeasonStorage();
  if (done) storage.taskDone[taskId] = true;
  else delete storage.taskDone[taskId];
  writeSeasonStorage(storage);
  return storage;
}

export function moveSeasonTaskToMonth(
  taskId: string,
  targetMonthId: string,
  seed: HomeMonth[],
  atTop = true
): SeasonStorageState {
  const storage = readSeasonStorage();
  storage.taskMonth[taskId] = targetMonthId;

  const built = buildSeasonMonths(seed, storage);
  for (const m of built) {
    const ids = m.tasks.map((t) => t.id);
    if (m.id === targetMonthId) {
      const filtered = ids.filter((id) => id !== taskId);
      storage.taskOrder[m.id] = atTop ? [taskId, ...filtered] : [...filtered, taskId];
    } else {
      storage.taskOrder[m.id] = ids.filter((id) => id !== taskId);
    }
  }

  writeSeasonStorage(storage);
  return storage;
}

export function deleteSeasonTask(taskId: string): SeasonStorageState {
  const storage = readSeasonStorage();
  if (taskId.startsWith("custom-")) {
    storage.customTasks = (storage.customTasks ?? []).filter((t) => t.id !== taskId);
  } else if (!storage.taskHidden.includes(taskId)) {
    storage.taskHidden = [...storage.taskHidden, taskId];
  }
  delete storage.taskDone[taskId];
  delete storage.taskMonth[taskId];
  for (const monthId of Object.keys(storage.taskOrder)) {
    storage.taskOrder[monthId] = storage.taskOrder[monthId]!.filter((id) => id !== taskId);
  }
  writeSeasonStorage(storage);
  return storage;
}

export function reorderSeasonTaskInMonth(
  monthId: string,
  taskIds: string[]
): SeasonStorageState {
  const storage = readSeasonStorage();
  storage.taskOrder[monthId] = taskIds;
  writeSeasonStorage(storage);
  return storage;
}

export function addSeasonTask(
  monthId: string,
  input: { text: string; href?: string }
): SeasonStorageState {
  const text = input.text.trim();
  if (!text) return readSeasonStorage();

  const storage = readSeasonStorage();
  const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const href = input.href?.trim();
  const task: SeasonCustomTask = {
    id,
    monthId,
    text,
    ...(href ? { href } : {}),
  };

  storage.customTasks = [...(storage.customTasks ?? []), task];
  const order = storage.taskOrder[monthId] ?? [];
  storage.taskOrder[monthId] = [id, ...order.filter((existingId) => existingId !== id)];
  writeSeasonStorage(storage);
  return storage;
}
