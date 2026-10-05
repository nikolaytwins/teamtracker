import { dayHours, dayModeMap, resolveWeekChecklist } from "@/lib/v2/agency/plan/plan-calendar-logic";
import type { PlanDayMode, PlanItemRow } from "@/lib/v2/agency/plan/plan-types";
import { addDays, fmtWeekday, mondayOf, parseYmd, toYmd } from "@/lib/v2/agency/plan/plan-utils";
import type {
  DayPlanChecklistId,
  DayPlanChecklistRow,
  DayPlanContext,
  DayPlanDaySnapshot,
  DayPlanEntry,
  DayWeekPlan,
} from "@/lib/v2/personal/finance-assistant/day-plan-types";

export const DAY_PLAN_WORK_HOURS = 4;
export const DAY_PLAN_BLOCK_MINUTES = 240; // 4 ч стратегический / творческий блок

export const DAY_PLAN_RULES_TEXT = [
  "В неделе: 1 стратегический день (блок 3–4 ч, можно совмещать с мероприятиями).",
  "1 творческий блок 3–4 ч (можно совмещать с мероприятиями).",
  "1 выход в люди (мероприятие / нетворкинг).",
  "1 день под свидание с Лерой.",
  "1 полный выходной (режим rest).",
  "Минимум 3 полноценных рабочих дня по 4 часа.",
  "Стратегию и творчество лучше ставить в дни без плотного рабочего капа; выходной — отдельный день без работы.",
];

const WD = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"] as const;

export function weekKeysFromMonday(mondayKey: string): string[] {
  const mon = parseYmd(mondayKey);
  return Array.from({ length: 7 }, (_, i) => toYmd(addDays(mon, i)));
}

export function resolveWeekStart(message: string, today = new Date()): string {
  const lower = message.toLowerCase();
  const thisMon = mondayOf(today);
  if (/следующ/i.test(lower)) return toYmd(addDays(thisMon, 7));
  if (/прошл/i.test(lower)) return toYmd(addDays(thisMon, -7));
  // явная дата YYYY-MM-DD
  const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return toYmd(mondayOf(parseYmd(iso[1]!)));
  return toYmd(thisMon);
}

function weekdayIndex(dateKey: string): number {
  return (parseYmd(dateKey).getDay() + 6) % 7;
}

/** Парсит упоминания дней: «в среду», «пт», «субботу» → индексы 0–6 */
export function parseWeekdayMentions(message: string): Partial<
  Record<"strategy" | "creative" | "social" | "lera" | "rest" | "work", number[]>
> {
  const lower = message.toLowerCase();
  const dayHits: number[] = [];
  // Нельзя опираться на \b с кириллицей (в JS \w = только ASCII).
  const patterns: [RegExp, number][] = [
    [/(?:^|[^а-яё])(?:понедельник|пон|пн)(?=[^а-яё]|$)/, 0],
    [/(?:^|[^а-яё])(?:вторник|вт)(?=[^а-яё]|$)/, 1],
    [/(?:^|[^а-яё])(?:сред[ауые]|ср)(?=[^а-яё]|$)/, 2],
    [/(?:^|[^а-яё])(?:четверг|чт)(?=[^а-яё]|$)/, 3],
    [/(?:^|[^а-яё])(?:пятниц[аыуе]|пт)(?=[^а-яё]|$)/, 4],
    [/(?:^|[^а-яё])(?:суббот[аыуе]|сб)(?=[^а-яё]|$)/, 5],
    [/(?:^|[^а-яё])(?:воскресень[еяю]|вс)(?=[^а-яё]|$)/, 6],
  ];
  for (const [re, idx] of patterns) {
    if (re.test(lower)) dayHits.push(idx);
  }

  const out: Partial<Record<"strategy" | "creative" | "social" | "lera" | "rest" | "work", number[]>> =
    {};

  const bind = (keys: Array<keyof typeof out>, idxs: number[]) => {
    if (!idxs.length) return;
    for (const k of keys) out[k] = idxs;
  };

  // «в среду мероприятие / нетворкинг / выход в люди»
  if (/мероприят|нетворк|выход\s+в\s+люд|социальн/i.test(lower)) {
    bind(["social"], dayHits.length ? dayHits : []);
  }
  if (/свидан|лер[аыуеой]/i.test(lower)) {
    bind(["lera"], dayHits.length ? dayHits : []);
  }
  if (/выходн|отдых|rest/i.test(lower)) {
    bind(["rest"], dayHits.length ? dayHits : []);
  }
  if (/стратег/i.test(lower)) {
    bind(["strategy"], dayHits.length ? dayHits : []);
  }
  if (/творч|креатив/i.test(lower)) {
    bind(["creative"], dayHits.length ? dayHits : []);
  }
  if (/работ/i.test(lower) && dayHits.length) {
    bind(["work"], dayHits);
  }

  // «среда — стратегия» style: day near keyword
  for (const [re, idx] of patterns) {
    const m = lower.match(re);
    if (!m || m.index == null) continue;
    const around = lower.slice(Math.max(0, m.index - 24), m.index + 40);
    if (/стратег/.test(around)) out.strategy = [...(out.strategy ?? []), idx];
    if (/творч|креатив/.test(around)) out.creative = [...(out.creative ?? []), idx];
    if (/свидан|лер/.test(around)) out.lera = [...(out.lera ?? []), idx];
    if (/мероприят|нетворк|социальн|люди/.test(around)) out.social = [...(out.social ?? []), idx];
    if (/выходн|отдых/.test(around)) out.rest = [...(out.rest ?? []), idx];
  }

  // unique
  for (const k of Object.keys(out) as Array<keyof typeof out>) {
    out[k] = [...new Set(out[k])];
  }
  return out;
}

export function buildDayPlanChecklist(
  weekKeys: string[],
  items: PlanItemRow[],
  modes: Map<string, PlanDayMode>,
  workHoursPerDay = DAY_PLAN_WORK_HOURS
): DayPlanChecklistRow[] {
  const weekTips = resolveWeekChecklist(weekKeys, items, modes);
  const tip = (id: string) => weekTips.find((t) => t.def.id === id);

  const workDays = weekKeys.filter((k) => {
    if (modes.get(k) === "rest") return false;
    return dayHours(items, k) >= workHoursPerDay - 0.1;
  });

  const rows: DayPlanChecklistRow[] = [
    {
      id: "strategy",
      label: "Стратегический день (3–4 ч)",
      ok: Boolean(tip("strategy")?.filled),
      plan_date: tip("strategy")?.dateKey ?? null,
    },
    {
      id: "creative",
      label: "Творческий блок (3–4 ч)",
      ok: Boolean(tip("creative")?.filled),
      plan_date: tip("creative")?.dateKey ?? null,
    },
    {
      id: "social",
      label: "Выход в люди",
      ok: Boolean(tip("social")?.filled),
      plan_date: tip("social")?.dateKey ?? null,
    },
    {
      id: "lera",
      label: "Свидание с Лерой",
      ok: Boolean(tip("lera")?.filled),
      plan_date: tip("lera")?.dateKey ?? null,
    },
    {
      id: "rest",
      label: "Полный выходной",
      ok: Boolean(tip("rest")?.filled),
      plan_date: tip("rest")?.dateKey ?? null,
    },
    {
      id: "work",
      label: "≥3 рабочих дня по 4 ч",
      ok: workDays.length >= 3,
      plan_date: workDays[0] ?? null,
      note: workDays.length ? `${workDays.length} дн.: ${workDays.map((d) => WD[weekdayIndex(d)]).join(", ")}` : "нет",
    },
  ];
  return rows;
}

function pickFree(
  weekKeys: string[],
  taken: Set<string>,
  prefer: number[],
  fallbackOrder: number[]
): string | null {
  for (const idx of prefer) {
    const k = weekKeys[idx];
    if (k && !taken.has(k)) return k;
  }
  for (const idx of fallbackOrder) {
    const k = weekKeys[idx];
    if (k && !taken.has(k)) return k;
  }
  return weekKeys.find((k) => !taken.has(k)) ?? null;
}

function extractTasks(message: string): string[] {
  const tasks: string[] = [];
  const bullets = message.match(/(?:^|\n)\s*[-•*]\s*(.+)/g);
  if (bullets) {
    for (const b of bullets) {
      const t = b.replace(/^[\s\n]*[-•*]\s*/, "").trim();
      if (t.length > 1) tasks.push(t);
    }
  }
  const дела = message.match(/дела[:\s]+(.+)/i);
  if (дела?.[1]) {
    for (const part of дела[1].split(/[,;]| и /i)) {
      const t = part.trim();
      if (t.length > 2 && t.length < 80) tasks.push(t);
    }
  }
  return [...new Set(tasks)].slice(0, 8);
}

/**
 * Правила: собрать недельный план с учётом уже занятых дней и упоминаний из сообщения.
 */
export function proposeDayWeekPlan(input: {
  weekStart: string;
  items: PlanItemRow[];
  dayModes: { plan_date: string; mode: PlanDayMode }[];
  message: string;
  workHoursPerDay?: number;
}): DayWeekPlan {
  const workH = input.workHoursPerDay ?? DAY_PLAN_WORK_HOURS;
  const weekKeys = weekKeysFromMonday(input.weekStart);
  const modes = dayModeMap(input.dayModes);
  const mentions = parseWeekdayMentions(input.message);
  const taken = new Set<string>();
  const entries: DayPlanEntry[] = [];
  const notes: string[] = [];

  // Уже заполненные режимы/события — уважаем
  const existing = buildDayPlanChecklist(weekKeys, input.items, modes, workH);
  for (const row of existing) {
    if (row.ok && row.plan_date && row.id !== "work") taken.add(row.plan_date);
  }

  const placeMode = (
    id: "strategy" | "creative" | "rest",
    prefer: number[],
    fallback: number[],
    blockTitle?: string
  ) => {
    const cur = existing.find((r) => r.id === id);
    if (cur?.ok && cur.plan_date) return cur.plan_date;
    const hinted = mentions[id] ?? [];
    const date =
      pickFree(weekKeys, taken, hinted.length ? hinted : prefer, fallback) ??
      null;
    if (!date) {
      notes.push(`Не нашла свободный день для: ${id}`);
      return null;
    }
    taken.add(date);
    if (id === "rest") {
      entries.push({ type: "mode", plan_date: date, mode: "rest" });
    } else {
      entries.push({
        type: "mode",
        plan_date: date,
        mode: id,
        block_title: blockTitle,
        planned_minutes: DAY_PLAN_BLOCK_MINUTES,
      });
    }
    return date;
  };

  const placeEvent = (
    id: "social" | "lera",
    prefer: number[],
    fallback: number[],
    title: string,
    time: string,
    label: string,
    minutes: number
  ) => {
    const cur = existing.find((r) => r.id === id);
    if (cur?.ok && cur.plan_date) return cur.plan_date;
    const hinted = mentions[id] ?? [];
    // Можно совмещать со стратегией/творчеством, но не с выходным и не с другим событием недели.
    const softTaken = new Set<string>();
    for (const e of entries) {
      if (e.type === "mode" && e.mode === "rest") softTaken.add(e.plan_date);
      if (e.type === "event") softTaken.add(e.plan_date);
    }
    const date =
      pickFree(weekKeys, softTaken, hinted.length ? hinted : prefer, fallback) ??
      pickFree(weekKeys, softTaken, prefer, fallback);
    if (!date) {
      notes.push(`Не нашла день для: ${title}`);
      return null;
    }
    // don't put events on rest day we're assigning
    const restEntry = entries.find((e) => e.type === "mode" && e.mode === "rest");
    if (restEntry && restEntry.plan_date === date) {
      const alt = pickFree(
        weekKeys,
        new Set([date, ...softTaken]),
        prefer,
        fallback
      );
      if (!alt) {
        notes.push(`Конфликт с выходным для: ${title}`);
        return null;
      }
      entries.push({
        type: "event",
        plan_date: alt,
        kind: "personal",
        title,
        event_time: time,
        duration_label: label,
        planned_minutes: minutes,
      });
      return alt;
    }
    entries.push({
      type: "event",
      plan_date: date,
      kind: "personal",
      title,
      event_time: time,
      duration_label: label,
      planned_minutes: minutes,
    });
    return date;
  };

  // Порядок: rest → strategy → creative → social → lera → work
  placeMode("rest", mentions.rest ?? [6], [6, 5, 0]);
  placeMode("strategy", mentions.strategy ?? [0, 1], [0, 1, 2], "Стратегический блок");
  placeMode("creative", mentions.creative ?? [2, 3], [3, 2, 4], "Творческий блок");
  placeEvent(
    "social",
    mentions.social ?? [3, 4],
    [4, 3, 2, 5],
    "Социальное событие",
    "19:00",
    "2 ч",
    120
  );
  placeEvent(
    "lera",
    mentions.lera ?? [5, 4],
    [5, 4, 6],
    "Свидание с Лерой",
    "19:00",
    "3 ч",
    180
  );

  const restDate = entries.find((e) => e.type === "mode" && e.mode === "rest")?.plan_date;
  const strategyDate = entries.find((e) => e.type === "mode" && e.mode === "strategy")?.plan_date;
  const creativeDate = entries.find((e) => e.type === "mode" && e.mode === "creative")?.plan_date;

  // Рабочие дни: будни без rest; strategy/creative могут совмещаться, но считаем «полноценный рабочий»
  // только дни без rest, где ставим 4ч работы (не на rest).
  const workPrefer = mentions.work ?? [];
  const workCandidates = weekKeys.filter((k) => {
    if (k === restDate) return false;
    const wd = weekdayIndex(k);
    return wd <= 4; // пн–пт first
  });
  const weekendCandidates = weekKeys.filter((k) => k !== restDate && weekdayIndex(k) >= 5);

  const tasks = extractTasks(input.message);
  const workDaysNeeded = Math.max(3, workPrefer.length || 3);
  const chosenWork: string[] = [];

  const tryAddWork = (k: string) => {
    if (chosenWork.includes(k)) return;
    if (k === restDate) return;
    chosenWork.push(k);
  };

  for (const idx of workPrefer) {
    const k = weekKeys[idx];
    if (k) tryAddWork(k);
  }
  for (const k of workCandidates) {
    if (chosenWork.length >= workDaysNeeded) break;
    // Prefer days that aren't already heavy event-only weekends
    tryAddWork(k);
  }
  for (const k of weekendCandidates) {
    if (chosenWork.length >= workDaysNeeded) break;
    tryAddWork(k);
  }

  let taskIdx = 0;
  for (const date of chosenWork.slice(0, Math.max(3, chosenWork.length))) {
    const title =
      tasks[taskIdx] ??
      (date === strategyDate
        ? "Рабочий блок (рядом со стратегией)"
        : date === creativeDate
          ? "Рабочий блок (рядом с творчеством)"
          : "Рабочий день");
    taskIdx += 1;
    entries.push({
      type: "work",
      plan_date: date,
      title,
      planned_minutes: workH * 60,
      priority: 3,
    });
  }
  // leftover tasks on work days
  while (taskIdx < tasks.length && chosenWork.length) {
    const date = chosenWork[taskIdx % chosenWork.length]!;
    entries.push({
      type: "work",
      plan_date: date,
      title: tasks[taskIdx]!,
      planned_minutes: 60,
      priority: 2,
    });
    taskIdx += 1;
  }

  const projectedModes = new Map(modes);
  const projectedItems = [...input.items];
  for (const e of entries) {
    if (e.type === "mode") projectedModes.set(e.plan_date, e.mode);
    if (e.type === "event") {
      projectedItems.push({
        id: `tmp-${e.plan_date}-${e.title}`,
        kind: e.kind,
        project_id: null,
        title: e.title,
        plan_date: e.plan_date,
        planned_minutes: e.planned_minutes ?? null,
        event_time: e.event_time ?? null,
        duration_label: e.duration_label ?? null,
        sort_order: 0,
        priority: 3,
        completed_at: null,
        work_status: "todo",
      });
    }
    if (e.type === "work") {
      projectedItems.push({
        id: `tmp-w-${e.plan_date}-${e.title}`,
        kind: "task",
        project_id: e.project_id ?? null,
        title: e.title,
        plan_date: e.plan_date,
        planned_minutes: e.planned_minutes,
        event_time: null,
        duration_label: null,
        sort_order: 0,
        priority: e.priority ?? 3,
        completed_at: null,
        work_status: "todo",
      });
    }
  }

  const checklist = buildDayPlanChecklist(weekKeys, projectedItems, projectedModes, workH);
  const lines = entries.map((e) => {
    const label = fmtWeekday(parseYmd(e.plan_date));
    if (e.type === "mode") {
      const modeLabel =
        e.mode === "strategy" ? "стратегия" : e.mode === "creative" ? "творчество" : "выходной";
      return `${label} — ${modeLabel}${e.block_title ? ` («${e.block_title}» ${DAY_PLAN_BLOCK_MINUTES / 60} ч)` : ""}`;
    }
    if (e.type === "event") return `${label} — ${e.title}${e.event_time ? ` в ${e.event_time}` : ""}`;
    return `${label} — работа: ${e.title} (${e.planned_minutes / 60} ч)`;
  });

  return {
    week_start: weekKeys[0]!,
    week_end: weekKeys[6]!,
    summary: `Неделя ${weekKeys[0]}…${weekKeys[6]}: ${lines.slice(0, 4).join("; ")}${lines.length > 4 ? "…" : ""}`,
    entries,
    checklist,
    notes: notes.length ? notes : undefined,
  };
}

export function snapshotDays(
  weekKeys: string[],
  items: PlanItemRow[],
  modes: Map<string, PlanDayMode>
): DayPlanDaySnapshot[] {
  return weekKeys.map((date) => ({
    date,
    weekday: WD[weekdayIndex(date)]!,
    mode: modes.get(date) ?? null,
    hours: dayHours(items, date),
    items: items
      .filter((it) => it.plan_date === date)
      .map((it) => ({
        id: it.id,
        kind: it.kind,
        title: it.title,
        plan_date: it.plan_date,
        planned_minutes: it.planned_minutes,
        event_time: it.event_time,
        priority: it.priority,
      })),
  }));
}

export function formatPlanForPrompt(plan: DayWeekPlan): string {
  const lines = plan.entries.map((e) => JSON.stringify(e));
  return `week ${plan.week_start}…${plan.week_end}\n${lines.join("\n")}\nchecklist: ${plan.checklist
    .map((c) => `${c.id}:${c.ok ? "ok" : "gap"}@${c.plan_date ?? "-"}`)
    .join(", ")}`;
}

export function checklistLabel(id: DayPlanChecklistId): string {
  return (
    {
      strategy: "Стратегический день",
      creative: "Творческий блок",
      social: "Выход в люди",
      lera: "Свидание с Лерой",
      rest: "Выходной",
      work: "Рабочие дни ×3",
    } as const
  )[id];
}

export function buildDayPlanContextPayload(
  weekStart: string,
  items: PlanItemRow[],
  dayModes: { plan_date: string; mode: PlanDayMode }[],
  workHoursPerDay = DAY_PLAN_WORK_HOURS
): DayPlanContext {
  const weekKeys = weekKeysFromMonday(weekStart);
  const modes = dayModeMap(dayModes);
  const checklist = buildDayPlanChecklist(weekKeys, items, modes, workHoursPerDay);
  const gaps = checklist.filter((c) => !c.ok).map((c) => c.label);
  return {
    week_start: weekKeys[0]!,
    week_end: weekKeys[6]!,
    work_hours_per_day: workHoursPerDay,
    days: snapshotDays(weekKeys, items, modes),
    checklist,
    rules_short: DAY_PLAN_RULES_TEXT,
    free_hint: gaps.length
      ? `На неделе ещё не закрыто: ${gaps.join("; ")}.`
      : "Чеклист недели закрыт — можно точечно двигать дни.",
  };
}
