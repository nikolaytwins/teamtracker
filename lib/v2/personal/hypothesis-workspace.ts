export const ROSTOV_HYPOTHESIS_TITLE = "Запуск Ростовских колбас через контент";
export const ROSTOV_HYPOTHESIS_BODY =
  "Если проверить рилсы, UGC и партнерскую программу, то хотя бы один канал даст первый доход.";
export const ROSTOV_HYPOTHESIS_CRITERION = "Первый доход или ≥ 1 партнёр";

export const ROSTOV_CONTENT_PLAN_HREF = "/v2/personal/articles/rostov-content-plan";
export const ROSTOV_UGC_HREF = "/v2/personal/articles/rostov-ugc";

export type HypothesisNoteTag = "win" | "fail" | "obs";

export type HypothesisTask = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  goal: number | null;
  n: number;
};

export type HypothesisStage = {
  id: string;
  title: string;
  note: string;
  tasks: HypothesisTask[];
};

export type HypothesisFile = { name: string; href: string };

export type HypothesisNote = {
  id: string;
  tag: HypothesisNoteTag;
  text: string;
  date: string;
};

export type HypothesisIdea = { id: string; text: string; archived: boolean };

export type HypothesisWorkspace = {
  stages: HypothesisStage[];
  files: HypothesisFile[];
  notes: HypothesisNote[];
  ideas: HypothesisIdea[];
};

const TAGS = new Set<HypothesisNoteTag>(["win", "fail", "obs"]);

function text(value: unknown, max: number) {
  return String(value ?? "").replace(/\u0000/g, "").slice(0, max);
}

function id(value: unknown, fallback: string) {
  const clean = text(value, 40).trim();
  return clean || fallback;
}

export function emptyHypothesisWorkspace(): HypothesisWorkspace {
  return { stages: [], files: [], notes: [], ideas: [] };
}

export function isRostovHypothesis(title: string) {
  return title.trim() === ROSTOV_HYPOTHESIS_TITLE;
}

export function rostovHypothesisWorkspace(): HypothesisWorkspace {
  return {
    stages: [
      {
        id: "st-business",
        title: "Разобраться с бизнесом",
        note: "",
        tasks: [
          {
            id: "tk-buyers",
            title: "Узнать у брата и родителей Что чаще покупают и заказывают повторно.",
            detail: "",
            done: false,
            goal: null,
            n: 0,
          },
          {
            id: "tk-role",
            title: "Договориться с братом о роли",
            detail: "",
            done: false,
            goal: null,
            n: 0,
          },
        ],
      },
      {
        id: "st-offer",
        title: "Подготовить оффер",
        note: "",
        tasks: [
          { id: "tk-set", title: "Создать дегустационный набор", detail: "", done: false, goal: null, n: 0 },
          { id: "tk-copy", title: "Прописать тексты на сайт", detail: "", done: false, goal: null, n: 0 },
        ],
      },
      {
        id: "st-site",
        title: "Подготовить сайт",
        note: "",
        tasks: [
          {
            id: "tk-shop",
            title: "Завайбкодить интернет-магазин",
            detail:
              "Дегустационный сет, без регистрации, подтверждение заказа по телефону. Надпись: Точную сумму подтвердим после взвешивания. Показывать районы и даты доставок. Предзапись для районов, где доставки пока нет.",
            done: false,
            goal: null,
            n: 0,
          },
        ],
      },
      {
        id: "st-reels",
        title: "Ролики",
        note: "Первые 12 роликов — разные форматы.\nСледующие 18 — преимущественно продолжения лучших.\nВыкладываю на все платформы",
        tasks: [
          { id: "tk-plan", title: "Контент-план утвердить", detail: "", done: false, goal: null, n: 0 },
          {
            id: "tk-gear",
            title: "Купить оборудование (петличка/штатив и тд)",
            detail: "",
            done: false,
            goal: null,
            n: 0,
          },
          { id: "tk-shoot", title: "Снять ролики", detail: "", done: false, goal: null, n: 0 },
          { id: "tk-publish", title: "Выпустить 30 роликов", detail: "", done: false, goal: 30, n: 0 },
        ],
      },
      {
        id: "st-ugc",
        title: "Параллельно проверить UGC",
        note: "",
        tasks: [
          {
            id: "tk-ugc",
            title: "Первая волна: 3 автора × 1 материал.",
            detail: "",
            done: false,
            goal: 3,
            n: 0,
          },
        ],
      },
    ],
    files: [
      { name: "Контент-план", href: ROSTOV_CONTENT_PLAN_HREF },
      { name: "UGC-креаторы", href: ROSTOV_UGC_HREF },
    ],
    notes: [],
    ideas: [],
  };
}

export function sanitizeHypothesisWorkspace(input: unknown): HypothesisWorkspace {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const stages = Array.isArray(raw.stages) ? raw.stages.slice(0, 40) : [];
  const files = Array.isArray(raw.files) ? raw.files.slice(0, 40) : [];
  const notes = Array.isArray(raw.notes) ? raw.notes.slice(0, 200) : [];
  const ideas = Array.isArray(raw.ideas) ? raw.ideas.slice(0, 200) : [];
  return {
    stages: stages.map((stage, stageIndex) => {
      const row = stage && typeof stage === "object" ? (stage as Record<string, unknown>) : {};
      const tasks = Array.isArray(row.tasks) ? row.tasks.slice(0, 80) : [];
      return {
        id: id(row.id, `st-${stageIndex}`),
        title: text(row.title, 200),
        note: text(row.note, 2000),
        tasks: tasks.map((task, taskIndex) => {
          const item = task && typeof task === "object" ? (task as Record<string, unknown>) : {};
          const goalRaw = Number(item.goal);
          const goal = Number.isFinite(goalRaw) && goalRaw > 0 ? Math.min(9999, Math.floor(goalRaw)) : null;
          const nRaw = Number(item.n);
          const n = Number.isFinite(nRaw) && nRaw > 0 ? Math.min(goal ?? 9999, Math.floor(nRaw)) : 0;
          return {
            id: id(item.id, `tk-${stageIndex}-${taskIndex}`),
            title: text(item.title, 400),
            detail: text(item.detail, 2000),
            done: Boolean(item.done),
            goal,
            n,
          };
        }),
      };
    }),
    files: files.map((file) => {
      const row = file && typeof file === "object" ? (file as Record<string, unknown>) : {};
      return { name: text(row.name, 120).trim(), href: text(row.href, 300).trim() };
    }).filter((file) => file.name && file.href),
    notes: notes.map((note, index) => {
      const row = note && typeof note === "object" ? (note as Record<string, unknown>) : {};
      const tag = TAGS.has(row.tag as HypothesisNoteTag) ? (row.tag as HypothesisNoteTag) : "obs";
      return {
        id: id(row.id, `nt-${index}`),
        tag,
        text: text(row.text, 2000),
        date: text(row.date, 40),
      };
    }).filter((note) => note.text.trim()),
    ideas: ideas.map((idea, index) => {
      const row = idea && typeof idea === "object" ? (idea as Record<string, unknown>) : {};
      return {
        id: id(row.id, `id-${index}`),
        text: text(row.text, 400),
        archived: Boolean(row.archived),
      };
    }).filter((idea) => idea.text.trim()),
  };
}

export function parseTaskDraft(raw: string): { title: string; goal: number | null } {
  const value = raw.trim();
  const match = value.match(/^(.*?)\s*[×x]\s*(\d+)$/i);
  if (!match) return { title: value, goal: null };
  const goal = Number(match[2]);
  if (!Number.isFinite(goal) || goal <= 0) return { title: value, goal: null };
  return { title: match[1].trim(), goal: Math.min(9999, Math.floor(goal)) };
}
