export type SportGoal = {
  wLo: number;
  wHi: number;
  fLo: number;
  fHi: number;
  lTarget: number;
  fTarget: number;
  raw: string;
};

export type SportDayMeasure = {
  w?: string | number | null;
  f?: string | number | null;
};

export type SportWeekAvg = {
  w?: number | null;
  f?: number | null;
  l?: number | null;
  n?: number;
};

export type SportWeek = {
  id: string;
  label: string;
  dates?: string;
  kcal?: number | null;
  protein?: number | null;
  wn?: number | null;
  ww?: number | null;
  avg?: SportWeekAvg | null;
  note?: string;
  days?: SportDayMeasure[];
};

export type SportStrategySection = {
  id: string;
  h: string;
  t: string;
};

export type SportExercise = {
  id: string;
  n: string;
  sets: number | string;
  reps: string;
  w?: string;
  goal?: string;
  note?: string;
  log?: string[];
};

export type SportProgramDay = {
  id: string;
  name: string;
  focus: string;
  total?: string;
  ex: SportExercise[];
};

export type SportSetLog = { w?: string; r?: string };

export type SportView = "metrics" | "weeks" | "training" | "strategy";

export type SportDoc = {
  view: SportView;
  weeks: SportWeek[];
  program: SportProgramDay[];
  acts: Record<string, Record<string, SportSetLog[]>>;
  strategy: SportStrategySection[];
  wid: string | null;
};

export const SP_GOAL: SportGoal = {
  wLo: 72,
  wHi: 74,
  fLo: 14,
  fHi: 16,
  lTarget: 62.2,
  fTarget: 11.8,
  raw: "72–74 кг при 14–16% жира",
};

export const SP_WEEKS_SEED: SportWeek[] = [
  {
    id: "w0",
    label: "До питания",
    dates: "точка отсчёта",
    kcal: null,
    protein: null,
    wn: null,
    ww: null,
    avg: { w: 68.05, f: 14.64, l: 53.41 },
    note: "До системного питания.",
  },
  {
    id: "w1",
    label: "Неделя 1",
    dates: "",
    kcal: null,
    protein: null,
    wn: null,
    ww: null,
    avg: { w: 68.172, f: 14.22, l: 53.95 },
    note: "",
  },
  {
    id: "w2",
    label: "Неделя 2",
    dates: "",
    kcal: 2300,
    protein: null,
    wn: null,
    ww: null,
    avg: { w: 68.6, f: 13.88, l: 54.72 },
    note: "Вторая неделя на 2300 ккал.",
  },
  {
    id: "w3",
    label: "Неделя 3",
    dates: "",
    kcal: 2300,
    protein: null,
    wn: null,
    ww: null,
    avg: { w: 69.3, f: 14.57, l: 54.73 },
    note: "",
  },
  {
    id: "w4",
    label: "Неделя 4",
    dates: "",
    kcal: 2300,
    protein: null,
    wn: 83,
    ww: 85,
    avg: { w: 68.98, f: 14.56, l: 54.42 },
    note: "Первое измерение живота: 83 по пупку, 85 по широкому месту.",
  },
];

export const SP_PROGRAM_SEED: SportProgramDay[] = [
  {
    id: "A",
    name: "Тренировка A",
    focus: "Верх груди, спина, квадрицепс, плечи и руки",
    total: "25 рабочих подходов",
    ex: [
      {
        id: "a1",
        n: "Жим гантелей на наклонной скамье",
        sets: 4,
        reps: "6–10",
        w: "14",
        note: "Можно заменить наклонным жимом в тренажёре.",
        log: [
          "1-я: 14 кг — 10, 10, 10 (последний еле дался), 10 (после 7-го с дрожью в руках)",
          "2-я: все 4 подхода на 10",
        ],
      },
      {
        id: "a2",
        n: "Горизонтальная тяга нижнего блока сидя",
        sets: 3,
        reps: "8–12",
        w: "30",
        goal: "Цель 12 / 12 / 12",
        note: "Локти ведёшь ближе к корпусу, рукоять тянешь к верхней части живота. Акцент на широчайшие и середину спины.",
        log: ["1-я: 25 кг — 10, 10; 30 кг — 7", "2-я: 25 кг — 12, 12, 12, легко"],
      },
      {
        id: "a3",
        n: "Жим ногами",
        sets: 3,
        reps: "8–12",
        w: "80",
        note: "Рабочая тяжёлая версия. Стопы на ширине плеч прямо, колени движутся по направлению носков.",
        log: ["80 кг — 10, 10, 10 (после прошлой трени плохо восстановились ноги, больше не тяну)"],
      },
      {
        id: "a4",
        n: "Махи в стороны с гантелями или в кроссовере",
        sets: 4,
        reps: "12–20",
        w: "5",
        goal: "5 кг на 12–15",
        note: "",
        log: ["1-я: 6 кг — 10, 10, 8", "2-я: 5 кг — 15, 12, 11"],
      },
      {
        id: "a5",
        n: "Разгибание рук на верхнем блоке",
        sets: 3,
        reps: "10–15",
        w: "12,5",
        note: "Канатная рукоять.",
        log: ["1-я: 12,5 кг — 10, 10; 15 кг — 7", "2-я: 12, 12, 10"],
      },
      {
        id: "a6",
        n: "Сгибание рук с гантелями сидя",
        sets: 3,
        reps: "10–15",
        w: "7",
        goal: "7 кг на 13–14",
        note: "",
        log: ["1-я: 7 кг — 10, 10; 8 кг — 8", "2-я: 7 кг — 12, 12, 12"],
      },
      { id: "a7", n: "Скручивания на блоке или пресс в тренажёре", sets: 2, reps: "10–15", w: "", note: "", log: [] },
    ],
  },
  {
    id: "B",
    name: "Тренировка B",
    focus: "Спина, задняя поверхность ног, грудь и руки",
    total: "22–24 подхода",
    ex: [
      {
        id: "b1",
        n: "Вертикальная тяга к груди или подтягивания",
        sets: 4,
        reps: "6–12",
        w: "40",
        note: "",
        log: ["1-я: тренажёр 40 кг — 10, 10, 8, 6", "2-я: гравитрон 28 кг — 10; 21 кг — 10, 8, 5"],
      },
      {
        id: "b2",
        n: "Разгибание ноги в тренажёре",
        sets: 3,
        reps: "10–15",
        w: "30",
        note: "",
        log: ["1-я: 30 кг — 10, 10, 9", "2-я: 10, 10, 10"],
      },
      {
        id: "b3",
        n: "Жим в тренажёре на грудь",
        sets: 3,
        reps: "8–12",
        w: "30",
        note: "",
        log: ["1-я: 30 кг — 10, 10, 10, крайние два раза тяжело", "2-я: другой тренажёр, 40 кг — 10, 10, 10"],
      },
      {
        id: "b4",
        n: "Горизонтальная тяга к верхней груди, на плечи",
        sets: 3,
        reps: "10–15",
        w: "20",
        goal: "20 кг на 12",
        note: "Локти широко, примерно на уровне плеч. Акцент на заднюю дельту, ромбовидные и верх спины.",
        log: ["20 кг — 10; 25 кг — 10; 25 кг — 10 (последние 2 еле-еле)"],
      },
      {
        id: "b5",
        n: "Сгибание ног в тренажёре лёжа",
        sets: 3,
        reps: "10–15",
        w: "20",
        goal: "20 кг на 12",
        note: "",
        log: ["1-я: 20 кг — 10, 10; 25 кг — 5", "2-я: 20 кг — 12, 12, 10"],
      },
      {
        id: "b6",
        n: "Гантель на трицепс за голову",
        sets: 3,
        reps: "10–15",
        w: "12,5",
        note: "Можно заменить отдельным тренажёром на трицепс, V-рукоять.",
        log: ["1-я: 12,5 кг — 10; 15 кг — 8, 7", "2-я: 12,5 кг — 12, 12, 9"],
      },
      {
        id: "b7",
        n: "Сгибание рук в тренажёре Скотта",
        sets: 3,
        reps: "8–12",
        w: "8",
        goal: "8 кг на руку, дальше 9",
        note: "",
        log: ["1-я: 8 кг — 10, 10, 10", "2-я: штанга 15 кг — 12, 12, 12"],
      },
      {
        id: "b8",
        n: "Гиперэкстензия в тренажёре",
        sets: 2,
        reps: "12–15",
        w: "5",
        goal: "необязательно",
        note: "Добавляй, только если поясница нормально восстанавливается и хочется дать ей прямую нагрузку.",
        log: ["5 кг — 8, 8, 5"],
      },
    ],
  },
  {
    id: "C",
    name: "Тренировка C",
    focus: "Специализация груди, плеч и рук, ноги и спина",
    total: "",
    ex: [
      { id: "c1", n: "Жим вверх на плечи", sets: 3, reps: "8–12", w: "", note: "", log: [] },
      {
        id: "c2",
        n: "Тяга одной рукой в рычажном тренажёре",
        sets: 3,
        reps: "8–12",
        w: "25",
        goal: "на руку · разминка 20 кг",
        note: "Локоть ближе к телу, тянешь к поясу. Акцент на широчайшие, в отличие от широкой высокой тяги в тренировке B.",
        log: ["1-я: 20 кг — 10; 25 кг — 10", "2-я: 20, 25, 25 — все на 10"],
      },
      {
        id: "c3",
        n: "Жим ногами",
        sets: 3,
        reps: "10–15",
        w: "80",
        note: "Здесь вес меньше, а повторений больше, чем в тренировке A.",
        log: ["80 кг — 10, 10, 10"],
      },
      {
        id: "c4",
        n: "Сведения рук в бабочке или кроссовере",
        sets: 3,
        reps: "12–15",
        w: "25",
        goal: "25 кг на 12",
        note: "",
        log: ["1-я: 25 кг — 10; 30 кг — 10, 8", "2-я: 25 кг — 12, 12, 12"],
      },
      {
        id: "c5",
        n: "Махи в стороны",
        sets: 3,
        reps: "12–20",
        w: "5",
        goal: "5 кг на 12",
        note: "",
        log: ["6 кг — 10, 10, 9"],
      },
      { id: "c6", n: "Сгибание ног в тренажёре", sets: 3, reps: "10–15", w: "", note: "", log: [] },
      {
        id: "c7",
        n: "Молотковые сгибания с гантелями или канатом",
        sets: 3,
        reps: "10–15",
        w: "8",
        goal: "пробовать 9 кг",
        note: "",
        log: ["8 кг — 15, 15, 15"],
      },
      {
        id: "c8",
        n: "Трицепс-машина или отжимания в тренажёре",
        sets: 3,
        reps: "8–15",
        w: "12,5",
        note: "",
        log: ["12,5 кг — 12, 12, 10"],
      },
      { id: "c9", n: "Подъёмы на носки в тренажёре или в жиме ногами", sets: 3, reps: "12–20", w: "", note: "", log: [] },
      { id: "c10", n: "Скручивания на блоке или пресс в тренажёре", sets: 2, reps: "10–15", w: "", note: "", log: [] },
    ],
  },
];

export const SP_STRATEGY_SEED: SportStrategySection[] = [{ id: "s1", h: "Стратегия", t: "" }];

export function seedSportDoc(): SportDoc {
  const weeks = SP_WEEKS_SEED.map((w) => ({ ...w, days: w.days ? [...w.days] : [] }));
  const program = SP_PROGRAM_SEED.map((d) => ({
    ...d,
    ex: d.ex.map((e) => ({ ...e, log: e.log ? [...e.log] : [] })),
  }));
  return {
    view: "metrics",
    weeks,
    program,
    acts: {},
    strategy: SP_STRATEGY_SEED.map((s) => ({ ...s })),
    wid: weeks[weeks.length - 1]?.id ?? null,
  };
}

export function normalizeSportDoc(raw: unknown): SportDoc {
  const seed = seedSportDoc();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return seed;
  const d = raw as Partial<SportDoc>;
  const weeks = Array.isArray(d.weeks) && d.weeks.length > 0 ? d.weeks : seed.weeks;
  const program = Array.isArray(d.program) && d.program.length > 0 ? d.program : seed.program;
  const strategy = Array.isArray(d.strategy) && d.strategy.length > 0 ? d.strategy : seed.strategy;
  const view =
    d.view === "weeks" || d.view === "training" || d.view === "strategy" || d.view === "metrics"
      ? d.view
      : seed.view;
  const wid =
    typeof d.wid === "string" && weeks.some((w) => w.id === d.wid)
      ? d.wid
      : weeks[weeks.length - 1]?.id ?? null;
  return {
    view,
    weeks,
    program,
    acts: d.acts && typeof d.acts === "object" && !Array.isArray(d.acts) ? d.acts : {},
    strategy,
    wid,
  };
}
