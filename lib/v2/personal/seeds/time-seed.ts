export type TimeMode = "planned" | "reactive";

export type TimeProject = {
  id: string;
  name: string;
  role: string;
  money: boolean;
  revenue?: number;
  profit?: number;
  split: [string, number][];
  note: string;
};

export type TimeEntry = {
  id: string;
  projectId: string;
  task: string;
  activity: string;
  mode: TimeMode;
  durationMin: number;
  at: string;
};

export type TimeRunning = {
  projectId: string;
  activity: string;
  mode: TimeMode;
  startedAt: string;
  task: string;
} | null;

export type TimeDoc = {
  activityTypes: string[];
  projects: TimeProject[];
  entries: TimeEntry[];
  review: string[];
  running: TimeRunning;
};

function parseDur(dur: string): number {
  const [h, m] = dur.split(":").map((x) => Number(x) || 0);
  return h * 60 + m;
}

/** Seed entries use Aug 2026 so they land in the current month relative to app date. */
export function seedTimeDoc(): TimeDoc {
  return {
    activityTypes: [
      "Production",
      "Strategy",
      "Communication",
      "Sales",
      "Management",
      "Learning",
      "Creative",
      "Other",
    ],
    projects: [
      {
        id: "agency",
        name: "Агентство",
        role: "Опора / cashflow",
        money: true,
        revenue: 186000,
        profit: 72400,
        split: [
          ["Production", 1.4],
          ["Communication", 2.6],
          ["Sales", 1.1],
          ["Management", 2.1],
        ],
        note: "Проект должен давать деньги при низком founder-load. Смотрим не только на часы, но и на количество вторжений.",
      },
      {
        id: "course",
        name: "Курс",
        role: "Существующий актив",
        money: true,
        revenue: 243000,
        profit: 118000,
        split: [
          ["Создание системы", 6.2],
          ["Презентации", 4.1],
          ["Запись", 7.4],
          ["Правки", 4.3],
          ["Коммуникация", 3.6],
          ["Продажи", 2.8],
        ],
        note: "Видно, что творческая и системная работа занимает меньше половины — остальное ручное обслуживание продукта.",
      },
      {
        id: "hire",
        name: "Найм / поиск работы",
        role: "Опора · главная ставка",
        money: false,
        split: [
          ["Позиционирование", 4.2],
          ["Отклики и контакты", 3.4],
          ["Собеседования", 2.6],
          ["Подготовка кейсов", 1.4],
        ],
        note: "Первое направление сезона. Здесь рост часов — хороший знак, а не перегрузка.",
      },
      {
        id: "brand",
        name: "Личный бренд",
        role: "Капитализация / магнит",
        money: false,
        split: [
          ["Ideas", 2.1],
          ["Scripts", 4.6],
          ["Shooting", 5.8],
          ["Editing", 3.4],
          ["Packaging", 2.3],
        ],
        note: "Съёмка забирает больше всего времени и нравится меньше всего. Это реальная стоимость контент-машины.",
      },
      {
        id: "saas",
        name: "SaaS / Qmagic",
        role: "Асимметрия",
        money: false,
        split: [
          ["Discovery", 2.4],
          ["Validation", 3.8],
          ["Building", 4.9],
          ["Bug fixing", 1.8],
          ["Marketing", 0.8],
          ["Support", 0.4],
        ],
        note: "Пока лаборатория, а не поддержка: багфиксинг и support занимают меньше 16%.",
      },
      {
        id: "arkalium",
        name: "Аркалиум",
        role: "Смысл · без KPI",
        money: false,
        split: [
          ["Creative", 5.1],
          ["Strategy", 1.3],
        ],
        note: "Единственный проект без reactive-времени. Это и есть признак защищённого пространства.",
      },
    ],
    entries: [
      {
        id: "e1",
        projectId: "agency",
        task: "Звонок с клиентом по правкам лендинга",
        activity: "Communication",
        mode: "reactive",
        durationMin: parseDur("0:48"),
        at: "2026-08-14T11:20:00.000Z",
      },
      {
        id: "e2",
        projectId: "hire",
        task: "Переписал позиционирование под AI Product",
        activity: "Strategy",
        mode: "planned",
        durationMin: parseDur("1:35"),
        at: "2026-08-14T09:30:00.000Z",
      },
      {
        id: "e3",
        projectId: "brand",
        task: "Съёмка ролика про усталость",
        activity: "Production",
        mode: "planned",
        durationMin: parseDur("2:20"),
        at: "2026-08-13T15:00:00.000Z",
      },
      {
        id: "e4",
        projectId: "saas",
        task: "Разбор фидбека первых 8 пользователей",
        activity: "Strategy",
        mode: "planned",
        durationMin: parseDur("1:10"),
        at: "2026-08-13T12:05:00.000Z",
      },
      {
        id: "e5",
        projectId: "agency",
        task: "Срочная правка макета к утру",
        activity: "Production",
        mode: "reactive",
        durationMin: parseDur("0:35"),
        at: "2026-08-13T21:40:00.000Z",
      },
      {
        id: "e6",
        projectId: "arkalium",
        task: "Черновик мира",
        activity: "Creative",
        mode: "planned",
        durationMin: parseDur("1:50"),
        at: "2026-08-12T14:00:00.000Z",
      },
      {
        id: "e7",
        projectId: "course",
        task: "Запись урока 04",
        activity: "Production",
        mode: "planned",
        durationMin: parseDur("2:05"),
        at: "2026-08-12T10:00:00.000Z",
      },
      {
        id: "e8",
        projectId: "course",
        task: "Ответы студентам",
        activity: "Communication",
        mode: "reactive",
        durationMin: parseDur("0:55"),
        at: "2026-08-11T16:30:00.000Z",
      },
    ],
    review: [
      "Агентство дало 72 400 ₽ прибыли и потребовало 7.2 часа.",
      "Курс занял 28.4 часа — больше, чем найм и SaaS вместе.",
      "Аркалиум — единственный проект без незапланированных вторжений.",
    ],
    running: null,
  };
}
