export type ContourSub = { key: string; title: string; note?: string };

export type ContourItem =
  | { kind: "check"; key: string; title: string; note?: string }
  | { kind: "count"; key: string; title: string; note?: string; max: number }
  | { kind: "group"; key: string; title: string; subs: ContourSub[] };

export type SprintContour = {
  id: string;
  name: string;
  title: string;
  with: string;
  goal: string;
  image: string;
  color: string;
  soft: string;
  items: ContourItem[];
};

export const SPRINT_CONTOURS: SprintContour[] = [
  {
    id: "u",
    name: "Контур 1",
    title: "Устойчивость",
    with: "TwinLabs Plus + текущие заказы + проверка part-time.",
    goal: "Создать стабильный доход, покрывающий жизнь в Москве",
    image: "Образ: стабильный доход, жизнь в Москве",
    color: "oklch(0.56 0.19 262)",
    soft: "oklch(0.96 0.025 262)",
    items: [
      {
        kind: "group",
        key: "tw",
        title: "Начать продавать TwinLabs Plus.",
        subs: [
          { key: "tw1", title: "Упаковать", note: "собрать работы / портфолио, оформить презу" },
          { key: "tw2", title: "Разослать теплым знакомым" },
          { key: "tw3", title: "Разослать холодным знакомым" },
          { key: "tw4", title: "Сделать ревью результата" },
        ],
      },
      { kind: "check", key: "pt", title: "Проверить part-time / найм как страховку" },
    ],
  },
  {
    id: "l",
    name: "Контур 2",
    title: "Красивая жизнь",
    with: "Лера + друзья + новые люди + чувственность + впечатления.",
    goal: "Не откладывать желаемую жизнь до момента, когда всё станет идеально.",
    image: "Образ: красивая жизнь, впечатления",
    color: "oklch(0.56 0.19 10)",
    soft: "oklch(0.96 0.025 10)",
    items: [
      { kind: "count", key: "dt", title: "Качественные свидания с Лерой", note: "1 в неделю", max: 7 },
      { kind: "count", key: "ev", title: "Выходы в общество", max: 7 },
      { kind: "check", key: "cb", title: "Посетить запланированное кабаре на ноябрь" },
    ],
  },
  {
    id: "f",
    name: "Контур 3",
    title: "Будущее",
    with: "FoodTech + личный бренд.",
    goal: "Проверять новые способы заработка и строить аудиторию. Двигаться спринтами. На неделю выбирать гипотезу.",
    image: "Образ: FoodTech и личный бренд",
    color: "oklch(0.56 0.19 300)",
    soft: "oklch(0.96 0.025 300)",
    items: [
      {
        kind: "count",
        key: "yt",
        title: "Ролики на YouTube",
        note: "как минимум 4 · два массовых, два реалити · посмотреть отклик",
        max: 4,
      },
      { kind: "count", key: "rl", title: "Рилсы в инстаграм", max: 16 },
      { kind: "count", key: "cr", title: "Карусели", max: 8 },
      {
        kind: "group",
        key: "ft",
        title: "Проверить фудтех",
        subs: [
          { key: "ft1", title: "Рилсы" },
          { key: "ft2", title: "ugc" },
          { key: "ft3", title: "Партнерская программа" },
        ],
      },
    ],
  },
];

export type SprintChecks = Record<string, boolean | number>;

export function contourProgress(contour: SprintContour, checks: SprintChecks): number {
  let done = 0;
  let total = 0;
  for (const item of contour.items) {
    if (item.kind === "count") {
      done += Math.min(item.max, Number(checks[item.key]) || 0);
      total += item.max;
    } else if (item.kind === "group") {
      for (const sub of item.subs) {
        total += 1;
        if (checks[sub.key]) done += 1;
      }
      total += 1;
      if (checks[item.key]) done += 1;
    } else {
      total += 1;
      if (checks[item.key]) done += 1;
    }
  }
  return total ? Math.round((done / total) * 100) : 0;
}

export function sprintDayProgress(now = new Date()) {
  const start = new Date(2026, 9, 13);
  const end = new Date(2026, 10, 30);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const total = Math.round((end.getTime() - start.getTime()) / 864e5) + 1;
  const day = Math.min(total, Math.max(1, Math.round((today.getTime() - start.getTime()) / 864e5) + 1));
  return { day, total, pct: (day / total) * 100 };
}
