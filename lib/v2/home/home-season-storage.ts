import type { HomeMonth, HomeSeasonPriority, HomeSeasonTask } from "@/lib/v2/personal/seeds/home-seed";

const STORAGE_KEY = "v2-home-season-v1";

/** Карточки сентября v1 — сняты при редизайне; убираем из «Прочее» и localStorage. */
const LEGACY_SEP_TASK_IDS = new Set([
  "sep-webinar-time",
  "sep-urgent-rules",
  "sep-finance-thresholds",
  "sep-lera-reglament",
  "sep-portfolio",
  "sep-model-fix",
  "sep-cv",
  "sep-reactivate",
]);

const LEGACY_SEP_TASK_TEXTS = new Set([
  "Оформить портфолио агентства",
  "Разобрать косяки прошлой модели и исправить",
  "Сделать 2 CV — одно на поддержку, одно на ИИ-внедрение",
  "Реактивировать базу",
  "Начать считать вебинарные проекты и трату времени на них",
  "Сформулировать правила срочных проектов",
  "Сформулировать финансовые пороги",
  "Прописать регламент перед разговором с Лерой",
]);

function migrateSeasonStorage(state: SeasonStorageState): SeasonStorageState {
  const hidden = new Set(state.taskHidden);
  for (const id of LEGACY_SEP_TASK_IDS) hidden.add(id);

  const customTasks = (state.customTasks ?? []).filter(
    (t) => !LEGACY_SEP_TASK_IDS.has(t.id) && !LEGACY_SEP_TASK_TEXTS.has(t.text.trim())
  );

  const taskOrder: Record<string, string[]> = {};
  for (const [monthId, ids] of Object.entries(state.taskOrder)) {
    taskOrder[monthId] = ids.filter((id) => !LEGACY_SEP_TASK_IDS.has(id));
  }

  const nextHidden = [...hidden];
  const changed =
    nextHidden.length !== state.taskHidden.length ||
    customTasks.length !== (state.customTasks ?? []).length ||
    JSON.stringify(taskOrder) !== JSON.stringify(state.taskOrder);

  if (!changed) return state;

  return { ...state, taskHidden: nextHidden, customTasks, taskOrder };
}

export type SeasonCustomTask = {
  id: string;
  monthId: string;
  text: string;
  href?: string;
  note?: string;
  priority?: HomeSeasonPriority;
};

export type SeasonTaskEdit = {
  text: string;
  href?: string;
  note?: string;
  priority?: HomeSeasonPriority;
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
  /** правки встроенных карточек */
  taskEdits: Record<string, SeasonTaskEdit>;
};

function emptyState(): SeasonStorageState {
  return { taskMonth: {}, taskOrder: {}, taskDone: {}, taskHidden: [], customTasks: [], taskEdits: {} };
}

export function readSeasonStorage(): SeasonStorageState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<SeasonStorageState>;
    const state: SeasonStorageState = {
      taskMonth: parsed.taskMonth ?? {},
      taskOrder: parsed.taskOrder ?? {},
      taskDone: parsed.taskDone ?? {},
      taskHidden: parsed.taskHidden ?? [],
      customTasks: parsed.customTasks ?? [],
      taskEdits: parsed.taskEdits ?? {},
    };
    const migrated = migrateSeasonStorage(state);
    if (migrated !== state) writeSeasonStorage(migrated);
    return migrated;
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
    if (LEGACY_SEP_TASK_IDS.has(taskId)) continue;
    const monthId = storage.taskMonth[taskId] ?? task.defaultMonthId;
    const edit = storage.taskEdits[taskId];
    const list = byMonth.get(monthId) ?? [];
    list.push({
      id: task.id,
      text: edit?.text ?? task.text,
      href: edit ? edit.href?.trim() || undefined : task.href,
      links: task.links,
      priority: "priority" in (edit ?? {}) ? edit!.priority : task.priority,
      note: edit && "note" in edit ? edit.note?.trim() || undefined : task.note,
      items: task.items,
      sections: task.sections,
      exclude: task.exclude,
      doneWhen: task.doneWhen,
      done: Boolean(storage.taskDone[taskId]),
    });
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
      note: custom.note,
      priority: custom.priority,
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
  delete storage.taskEdits[taskId];
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

function setTaskPriority(
  storage: SeasonStorageState,
  taskId: string,
  priority: HomeSeasonPriority | undefined,
  seed: HomeMonth[]
): void {
  if (taskId.startsWith("custom-")) {
    storage.customTasks = (storage.customTasks ?? []).map((task) =>
      task.id === taskId ? { ...task, priority } : task
    );
    return;
  }

  const seedTask = seed.flatMap((m) => m.tasks).find((t) => t.id === taskId);
  if (!seedTask) return;
  const existing = storage.taskEdits[taskId];
  storage.taskEdits[taskId] = {
    text: existing?.text ?? seedTask.text,
    ...(existing?.href ? { href: existing.href } : seedTask.href ? { href: seedTask.href } : {}),
    priority,
  };
}

function reorderForPriority(
  storage: SeasonStorageState,
  monthId: string,
  taskId: string,
  priority: HomeSeasonPriority | undefined,
  seed: HomeMonth[]
): void {
  const built = buildSeasonMonths(seed, storage);
  const month = built.find((m) => m.id === monthId);
  if (!month) return;

  const rest = month.tasks.filter((t) => t.id !== taskId);
  const high = rest.filter((t) => t.priority === "high").map((t) => t.id);
  const medium = rest.filter((t) => t.priority === "medium").map((t) => t.id);
  const low = rest.filter((t) => t.priority === "low").map((t) => t.id);
  const other = rest.filter((t) => !t.priority).map((t) => t.id);

  const order: string[] = [];
  if (priority === "high") order.push(...high, taskId, ...medium, ...low, ...other);
  else if (priority === "medium") order.push(...high, ...medium, taskId, ...low, ...other);
  else if (priority === "low") order.push(...high, ...medium, ...low, taskId, ...other);
  else order.push(...high, ...medium, ...low, ...other, taskId);

  storage.taskOrder[monthId] = order;
}

export function moveSeasonTaskToPriority(
  taskId: string,
  monthId: string,
  priority: HomeSeasonPriority | undefined,
  seed: HomeMonth[]
): SeasonStorageState {
  const storage = readSeasonStorage();
  setTaskPriority(storage, taskId, priority, seed);
  reorderForPriority(storage, monthId, taskId, priority, seed);
  writeSeasonStorage(storage);
  return storage;
}

export function addSeasonTask(
  monthId: string,
  input: { text: string; href?: string; note?: string; priority?: HomeSeasonPriority },
  seed: HomeMonth[]
): SeasonStorageState {
  const text = input.text.trim();
  if (!text) return readSeasonStorage();

  const storage = readSeasonStorage();
  const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const href = input.href?.trim();
  const note = input.note?.trim();
  const task: SeasonCustomTask = {
    id,
    monthId,
    text,
    ...(href ? { href } : {}),
    ...(note ? { note } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
  };

  storage.customTasks = [...(storage.customTasks ?? []), task];
  reorderForPriority(storage, monthId, id, input.priority, seed);
  writeSeasonStorage(storage);
  return storage;
}

export function updateSeasonTask(
  taskId: string,
  input: { text: string; href?: string; note?: string; priority?: HomeSeasonPriority },
  seed: HomeMonth[] = []
): SeasonStorageState {
  const text = input.text.trim();
  if (!text) return readSeasonStorage();

  const storage = readSeasonStorage();
  const href = input.href?.trim();
  const note = input.note?.trim();
  const hasPriority = "priority" in input;
  const hasNote = "note" in input;

  if (taskId.startsWith("custom-")) {
    storage.customTasks = (storage.customTasks ?? []).map((task) => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        text,
        ...(href ? { href } : {}),
        ...(hasNote ? { note: note || undefined } : {}),
        ...(hasPriority ? { priority: input.priority } : {}),
      };
    });
    const monthId =
      storage.taskMonth[taskId] ?? storage.customTasks.find((t) => t.id === taskId)?.monthId;
    if (monthId && hasPriority) reorderForPriority(storage, monthId, taskId, input.priority, seed);
  } else {
    const existing = storage.taskEdits[taskId];
    storage.taskEdits[taskId] = {
      text,
      ...(href ? { href } : existing?.href ? { href: existing.href } : {}),
      ...(hasNote ? { note: note || undefined } : existing?.note !== undefined ? { note: existing.note } : {}),
      ...(hasPriority ? { priority: input.priority } : existing?.priority !== undefined ? { priority: existing.priority } : {}),
    };
    const seedMonth = seed.find((m) => m.tasks.some((t) => t.id === taskId));
    const monthId = storage.taskMonth[taskId] ?? seedMonth?.id;
    if (monthId && hasPriority) reorderForPriority(storage, monthId, taskId, input.priority, seed);
  }

  writeSeasonStorage(storage);
  return storage;
}
