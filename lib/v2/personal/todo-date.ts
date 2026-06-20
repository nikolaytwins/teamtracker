const MS_DAY = 86_400_000;

export function personalTodoTodayYmd(): string {
  const d = new Date();
  return ymdFromDate(d);
}

export function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseYmd(ymd: string): Date {
  return new Date(ymd + "T12:00:00");
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return ymdFromDate(d);
}

export function addDaysFromToday(days: number): string {
  return addDaysYmd(personalTodoTodayYmd(), days);
}

const WEEKDAY_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"] as const;
const WEEKDAY_MAP: Record<string, number> = {
  вс: 0,
  пн: 1,
  вт: 2,
  ср: 3,
  чт: 4,
  пт: 5,
  сб: 6,
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function nextWeekdayYmd(fromYmd: string, weekday: number): string {
  const d = parseYmd(fromYmd);
  const cur = d.getDay();
  let delta = weekday - cur;
  if (delta <= 0) delta += 7;
  d.setDate(d.getDate() + delta);
  return ymdFromDate(d);
}

export type ParsedQuickAdd = {
  title: string;
  due_date: string | null;
  scheduled_date: string | null;
  priority: "urgent" | "high" | "medium" | "low" | null;
};

/** Простой разбор хвоста строки: «купить молоко завтра p1» */
export function parsePersonalQuickAdd(raw: string): ParsedQuickAdd {
  let title = raw.trim();
  let due_date: string | null = null;
  let scheduled_date: string | null = null;
  let priority: ParsedQuickAdd["priority"] = null;

  const today = personalTodoTodayYmd();

  const pri = title.match(/\s+(p1|p2|p3|p4|!{1,3})\s*$/i);
  if (pri) {
    const token = pri[1]!.toLowerCase();
    priority =
      token === "p1" || token === "!!!"
        ? "urgent"
        : token === "p2" || token === "!!"
          ? "high"
          : token === "p3" || token === "!"
            ? "medium"
            : token === "p4"
              ? "low"
              : "low";
    title = title.slice(0, pri.index).trim();
  }

  const dateTail = title.match(
    /\s+(сегодня|завтра|послезавтра|today|tomorrow|mon|tue|wed|thu|fri|sat|sun|пн|вт|ср|чт|пт|сб|вс)\s*$/i
  );
  if (dateTail) {
    const token = dateTail[1]!.toLowerCase();
    if (token === "сегодня" || token === "today") {
      scheduled_date = today;
      due_date = today;
    } else if (token === "завтра" || token === "tomorrow") {
      scheduled_date = addDaysYmd(today, 1);
      due_date = scheduled_date;
    } else if (token === "послезавтра") {
      scheduled_date = addDaysYmd(today, 2);
      due_date = scheduled_date;
    } else {
      const wd = WEEKDAY_MAP[token];
      if (wd != null) {
        scheduled_date = nextWeekdayYmd(today, wd);
        due_date = scheduled_date;
      }
    }
    title = title.slice(0, dateTail.index).trim();
  }

  return { title, due_date, scheduled_date, priority };
}

export function formatPersonalTodoDateLabel(ymd: string | null, today = personalTodoTodayYmd()): string | null {
  if (!ymd) return null;
  if (ymd === today) return "Сегодня";
  if (ymd === addDaysYmd(today, 1)) return "Завтра";
  if (ymd === addDaysYmd(today, -1)) return "Вчера";
  const d = parseYmd(ymd);
  const wd = WEEKDAY_SHORT[d.getDay()] ?? "";
  return `${wd} ${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function personalTodoWeekDates(startYmd = personalTodoTodayYmd(), count = 7): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(addDaysYmd(startYmd, i));
  return out;
}

export function isPersonalTodoOverdue(todo: { due_date: string | null; completed_at: string | null }, today = personalTodoTodayYmd()) {
  if (!todo.due_date || todo.completed_at) return false;
  return todo.due_date < today;
}
