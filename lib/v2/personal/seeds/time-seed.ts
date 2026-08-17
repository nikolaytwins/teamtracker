export type TimeMode = "planned" | "reactive";

export type TimeTaskType = {
  id: string;
  name: string;
};

export type TimeProject = {
  id: string;
  name: string;
  role: string;
  money: boolean;
  revenue?: number;
  profit?: number;
  /** Типы задач только этого проекта (не пересекаются с другими). */
  taskTypes: TimeTaskType[];
  /** Legacy fallback for empty month split charts. */
  split: [string, number][];
  note: string;
};

export type TimeEntry = {
  id: string;
  projectId: string;
  task: string;
  activityId: string;
  /** Snapshot имени типа на момент записи. */
  activity: string;
  mode: TimeMode;
  durationMin: number;
  at: string;
  /** Проект из «Проекты и финансы» (agency), если привязан. */
  agencyProjectId?: string | null;
  agencyProjectName?: string | null;
};

export type TimeRunning = {
  projectId: string;
  activityId: string;
  activity: string;
  mode: TimeMode;
  startedAt: string;
  task: string;
  agencyProjectId?: string | null;
  agencyProjectName?: string | null;
} | null;

export type TimeDoc = {
  projects: TimeProject[];
  entries: TimeEntry[];
  review: string[];
  running: TimeRunning;
};

function typesFrom(projectId: string, names: string[]): TimeTaskType[] {
  return names.map((name, i) => ({
    id: `tt_${projectId}_${i}_${name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "_").slice(0, 24)}`,
    name,
  }));
}

/** Migrate older docs that had global activityTypes / string-only activities. */
export function normalizeTimeDoc(raw: unknown): TimeDoc {
  const seed = seedTimeDoc();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return seed;
  const d = raw as Partial<TimeDoc> & { activityTypes?: string[] };
  const projectsIn = Array.isArray(d.projects) ? d.projects : seed.projects;

  const projects: TimeProject[] = projectsIn.map((p, idx) => {
    const base = p as TimeProject & { taskTypes?: TimeTaskType[] };
    const id = String(base.id || `p_${idx}`);
    let taskTypes = Array.isArray(base.taskTypes) ? base.taskTypes.filter((t) => t?.id && t?.name) : [];
    if (!taskTypes.length) {
      const fromSplit = Array.isArray(base.split)
        ? base.split.map((s) => String(Array.isArray(s) ? s[0] : "")).filter(Boolean)
        : [];
      const seedMatch = seed.projects.find((x) => x.id === id);
      const fallback = fromSplit.length
        ? fromSplit
        : seedMatch?.taskTypes.map((t) => t.name) ?? ["Strategy", "Production", "Communication", "Other"];
      taskTypes = typesFrom(id, [...new Set(fallback)]);
    }
    const financeLinked = id === "agency" || id === "course" || id === "saas";
    const name =
      id === "saas"
        ? "Qmagic"
        : String(base.name || seed.projects.find((x) => x.id === id)?.name || "Проект");
    return {
      id,
      name,
      role: String(base.role || seed.projects.find((x) => x.id === id)?.role || ""),
      money: financeLinked ? true : Boolean(base.money),
      revenue: base.revenue,
      profit: base.profit,
      taskTypes,
      split: [],
      note: String(base.note || ""),
    };
  });

  const byId = new Map(projects.map((p) => [p.id, p]));
  const seedEntryIds = new Set(["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"]);
  const entriesIn = Array.isArray(d.entries) ? d.entries : [];
  const entries: TimeEntry[] = entriesIn
    .filter((e) => {
      const row = e as TimeEntry;
      return !seedEntryIds.has(String(row.id || ""));
    })
    .map((e, i) => {
    const row = e as TimeEntry & { activity?: string; activityId?: string };
    const project = byId.get(String(row.projectId)) ?? projects[0];
    const types = project?.taskTypes ?? [];
    let activityId = String(row.activityId || "");
    let activity = String(row.activity || "");
    let tt = types.find((t) => t.id === activityId);
    if (!tt && activity) tt = types.find((t) => t.name === activity);
    if (!tt) tt = types[0];
    if (tt) {
      activityId = tt.id;
      activity = activity || tt.name;
    }
    return {
      id: String(row.id || `e_${i}`),
      projectId: String(row.projectId || project?.id || ""),
      task: String(row.task || ""),
      activityId,
      activity,
      mode: row.mode === "reactive" ? "reactive" : "planned",
      durationMin: Number(row.durationMin) || 0,
      at: String(row.at || new Date().toISOString()),
      agencyProjectId: row.agencyProjectId ? String(row.agencyProjectId) : null,
      agencyProjectName: row.agencyProjectName ? String(row.agencyProjectName) : null,
    };
  });

  let running: TimeRunning = null;
  if (d.running && typeof d.running === "object") {
    const r = d.running as TimeRunning & { activity?: string; activityId?: string };
    const project = byId.get(String(r.projectId)) ?? projects[0];
    const types = project?.taskTypes ?? [];
    let activityId = String(r.activityId || "");
    let activity = String(r.activity || "");
    let tt = types.find((t) => t.id === activityId);
    if (!tt && activity) tt = types.find((t) => t.name === activity);
    if (!tt) tt = types[0];
    if (project && tt) {
      running = {
        projectId: project.id,
        activityId: tt.id,
        activity: tt.name,
        mode: r.mode === "reactive" ? "reactive" : "planned",
        startedAt: String(r.startedAt || new Date().toISOString()),
        task: String(r.task || ""),
        agencyProjectId: r.agencyProjectId ? String(r.agencyProjectId) : null,
        agencyProjectName: r.agencyProjectName ? String(r.agencyProjectName) : null,
      };
    }
  }

  return {
    projects: projects.length ? projects : seed.projects,
    entries,
    review: [],
    running,
  };
}

/** Empty starter doc — hours and money come from real entries / finance. */
export function seedTimeDoc(): TimeDoc {
  const agencyTypes = typesFrom("agency", ["Production", "Communication", "Sales", "Management", "Strategy"]);
  const courseTypes = typesFrom("course", [
    "Создание системы",
    "Презентации",
    "Запись",
    "Правки",
    "Коммуникация",
    "Продажи",
    "Production",
  ]);
  const hireTypes = typesFrom("hire", ["Позиционирование", "Отклики и контакты", "Собеседования", "Подготовка кейсов", "Strategy"]);
  const brandTypes = typesFrom("brand", ["Ideas", "Scripts", "Shooting", "Editing", "Packaging", "Production"]);
  const saasTypes = typesFrom("saas", ["Discovery", "Validation", "Building", "Bug fixing", "Marketing", "Support", "Strategy"]);
  const arkaliumTypes = typesFrom("arkalium", ["Creative", "Strategy"]);

  const projects: TimeProject[] = [
    {
      id: "agency",
      name: "Агентство",
      role: "Опора / cashflow",
      money: true,
      revenue: 0,
      profit: 0,
      taskTypes: agencyTypes,
      split: [],
      note: "",
    },
    {
      id: "course",
      name: "Курс",
      role: "Существующий актив · Импульс",
      money: true,
      revenue: 0,
      profit: 0,
      taskTypes: courseTypes,
      split: [],
      note: "",
    },
    {
      id: "hire",
      name: "Найм / поиск работы",
      role: "Опора · главная ставка",
      money: false,
      taskTypes: hireTypes,
      split: [],
      note: "",
    },
    {
      id: "brand",
      name: "Личный бренд",
      role: "Капитализация / магнит",
      money: false,
      taskTypes: brandTypes,
      split: [],
      note: "",
    },
    {
      id: "saas",
      name: "Qmagic",
      role: "Асимметрия",
      money: true,
      revenue: 0,
      profit: 0,
      taskTypes: saasTypes,
      split: [],
      note: "",
    },
    {
      id: "arkalium",
      name: "Аркалиум",
      role: "Смысл · без KPI",
      money: false,
      taskTypes: arkaliumTypes,
      split: [],
      note: "",
    },
  ];

  return {
    projects,
    entries: [],
    review: [],
    running: null,
  };
}
