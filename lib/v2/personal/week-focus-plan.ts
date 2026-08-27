/** План фокуса недель (из рабочего плана курса / медийки). */

export type WeekFocusGoal = {
  id: string;
  title: string;
};

export type WeekFocusPlan = {
  id: string;
  /** Понедельник недели YYYY-MM-DD */
  from: string;
  /** Воскресенье недели YYYY-MM-DD */
  to: string;
  label: string;
  resultTitle: string;
  goals: WeekFocusGoal[];
};

export const WEEK_FOCUS_PLANS: WeekFocusPlan[] = [
  {
    id: "w1-2026-07-27",
    from: "2026-07-27",
    to: "2026-08-02",
    label: "27 июл — 2 авг",
    resultTitle: "Главный результат недели",
    goals: [
      { id: "w1-g1", title: "Модуль 3 полностью готов и загружен" },
      { id: "w1-g2", title: "Урок по копирайтингу записан" },
      { id: "w1-g3", title: "YouTube снят и подготовлен к публикации" },
      { id: "w1-g4", title: "Поиск исполнителя запущен" },
    ],
  },
  {
    id: "w2-2026-08-03",
    from: "2026-08-03",
    to: "2026-08-09",
    label: "3–9 авг",
    resultTitle: "Главный результат недели",
    goals: [
      {
        id: "w2-g1",
        title: "Модули 1 и 6 полностью подготовлены, сняты, смонтированы и загружены",
      },
      { id: "w2-g2", title: "Исполнитель модулей 7–8 выбран и поставлен в работу" },
    ],
  },
  {
    id: "w3-2026-08-10",
    from: "2026-08-10",
    to: "2026-08-16",
    label: "10–16 авг",
    resultTitle: "Главный результат недели",
    goals: [
      { id: "w3-g1", title: "Модуль 9 полностью подготовлен, снят, смонтирован и загружен" },
      { id: "w3-g2", title: "Модуль 7 проходит производство у исполнителя" },
      { id: "w3-g3", title: "YouTube снят" },
    ],
  },
  {
    id: "w4-2026-08-17",
    from: "2026-08-17",
    to: "2026-08-23",
    label: "17–23 авг",
    resultTitle: "Результат недели",
    goals: [
      { id: "w4-g1", title: "Модуль 10 полностью снят" },
      { id: "w4-g2", title: "Модуль 7 принят и загружен" },
      { id: "w4-g3", title: "YouTube выложен" },
    ],
  },
  {
    id: "w5-2026-08-24",
    from: "2026-08-24",
    to: "2026-08-30",
    label: "24–30 авг",
    resultTitle: "Результат недели",
    goals: [
      { id: "w5-g1", title: "Модуль 10 полностью готов" },
      { id: "w5-g2", title: "Модуль 8 принят" },
      { id: "w5-g3", title: "Весь проданный комплект проверен и закрыт" },
    ],
  },
];

export type CalendarSeedDeadline = {
  title: string;
  date: string;
  project: "Курс" | "Медийка" | "Курс + медийка";
  priority: "urgent" | "high" | "medium";
};

/** Дедлайны календаря из плана — заменяют прежний сид. */
export const CALENDAR_SEED_DEADLINES: CalendarSeedDeadline[] = [
  // Неделя 1
  {
    title: "Подготовка модуля 3 + исходники для урока по текстам + сценарий YouTube",
    date: "2026-07-27",
    project: "Курс + медийка",
    priority: "high",
  },
  {
    title: "Съёмка урока по копирайтингу + YouTube",
    date: "2026-07-29",
    project: "Курс + медийка",
    priority: "urgent",
  },
  {
    title: "Поиск исполнителя + монтаж YouTube",
    date: "2026-07-31",
    project: "Курс + медийка",
    priority: "high",
  },
  {
    title: "Съёмка №2 модуля 3 — дизайн презентаций",
    date: "2026-07-31",
    project: "Курс",
    priority: "high",
  },
  {
    title: "Монтаж и загрузка модуля 3",
    date: "2026-08-01",
    project: "Курс",
    priority: "high",
  },
  {
    title: "Публикация YouTube",
    date: "2026-08-01",
    project: "Медийка",
    priority: "high",
  },
  {
    title: "Выход модуля 3",
    date: "2026-08-03",
    project: "Курс",
    priority: "high",
  },
  // Неделя 2
  {
    title: "Общая подготовка модулей 6 и 1",
    date: "2026-08-04",
    project: "Курс",
    priority: "high",
  },
  {
    title: "Первая основная съёмка: модуль 6 + урок модуля 1",
    date: "2026-08-06",
    project: "Курс",
    priority: "urgent",
  },
  {
    title: "Вторая основная съёмка модуля 6",
    date: "2026-08-08",
    project: "Курс",
    priority: "urgent",
  },
  {
    title: "Общий монтаж и загрузка (модули 1, 6 + копирайтинг)",
    date: "2026-08-09",
    project: "Курс",
    priority: "high",
  },
  // Неделя 3
  {
    title: "Подготовка модуля 9",
    date: "2026-08-11",
    project: "Курс",
    priority: "high",
  },
  {
    title: "Сценарий YouTube",
    date: "2026-08-12",
    project: "Медийка",
    priority: "high",
  },
  {
    title: "Съёмка №1 модуля 9",
    date: "2026-08-13",
    project: "Курс",
    priority: "urgent",
  },
  {
    title: "Съёмка №2 модуля 9 + YouTube",
    date: "2026-08-15",
    project: "Курс + медийка",
    priority: "urgent",
  },
  {
    title: "Монтаж и загрузка модуля 9",
    date: "2026-08-16",
    project: "Курс",
    priority: "high",
  },
  // Неделя 4
  {
    title: "Подготовка модуля 10",
    date: "2026-08-18",
    project: "Курс",
    priority: "high",
  },
  {
    title: "Выложить YouTube",
    date: "2026-08-20",
    project: "Медийка",
    priority: "high",
  },
  {
    title: "Съёмка №1 модуля 10",
    date: "2026-08-20",
    project: "Курс",
    priority: "urgent",
  },
  {
    title: "Съёмка №2 модуля 10",
    date: "2026-08-22",
    project: "Курс",
    priority: "urgent",
  },
  // Неделя 5
  {
    title: "Монтаж и загрузка модуля 10",
    date: "2026-08-25",
    project: "Курс",
    priority: "high",
  },
];

/** Старые сиды — удаляем по паре title+date. */
export const LEGACY_CALENDAR_SEEDS: ReadonlyArray<{ title: string; date: string }> = [
  { title: "Подготовительный спринт следующего модуля", date: "2026-07-24" },
  { title: "Сценарий YouTube", date: "2026-07-24" },
  { title: "Общий съёмочный день: курс + YouTube", date: "2026-07-25" },
  { title: "Второй съёмочный спринт курса", date: "2026-07-29" },
  { title: "Монтаж, оформление и загрузка модуля", date: "2026-08-01" },
  { title: "Разговор с Лерой", date: "2026-10-03" },
];

export function weekMondayYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function weekSundayYmd(mondayYmd: string): string {
  const [y, m, d] = mondayYmd.split("-").map(Number);
  const date = new Date(y!, m! - 1, d! + 6);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function formatWeekRangeShort(from: string, to: string): string {
  const fmt = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(
      new Date(y!, m! - 1, d!)
    );
  };
  return `${fmt(from)} — ${fmt(to)}`;
}

/** @deprecated static seed lookup — use DB week focus */
export function findWeekFocusPlan(ymd: string): WeekFocusPlan | null {
  if (!WEEK_FOCUS_PLANS.length) return null;
  const monday = weekMondayYmd(ymd);
  const exact = WEEK_FOCUS_PLANS.find((plan) => plan.from === monday);
  if (exact) return exact;

  const containing = WEEK_FOCUS_PLANS.find((plan) => ymd >= plan.from && ymd <= plan.to);
  if (containing) return containing;

  const upcoming = WEEK_FOCUS_PLANS.find((plan) => plan.from > ymd);
  if (upcoming) return upcoming;

  return WEEK_FOCUS_PLANS[WEEK_FOCUS_PLANS.length - 1] ?? null;
}
