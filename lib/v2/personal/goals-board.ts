export type GoalCat = "must" | "want" | "extra";
export type FundKey = "cush" | "wish" | "est";

export type LifeGoal = {
  id: string;
  c: GoalCat;
  t: string;
  p: number;
  v: number;
  fund?: "cush";
  noimg?: boolean;
  done?: boolean;
  dd?: string;
  paid?: number;
  note?: string;
};

export type GoalsBoard = {
  flow: number;
  targets: { cush: number; est: number };
  goals: LifeGoal[];
};

export const FUND_KEYS: FundKey[] = ["cush", "wish", "est"];

export const FUND_DB: Record<FundKey, string> = {
  cush: "cushion",
  wish: "wishes",
  est: "estate",
};

export const FUND_NAME: Record<FundKey, string> = {
  cush: "Подушка безопасности",
  wish: "Фонд желаний",
  est: "Фонд недвижимости",
};

export const FUND_SHORT: Record<FundKey, string> = {
  cush: "Подушка",
  wish: "Желания",
  est: "Недвижимость",
};

export const GOAL_TIERS = [
  { n: "До 360к", d: "до 360 000 ₽", r: [100, 0, 0] },
  { n: "360–540к", d: "360–540 тыс", r: [70, 20, 10] },
  { n: "540–720к", d: "540–720 тыс", r: [55, 35, 10] },
  { n: "От 720к", d: "от 720 000 ₽", r: [0, 35, 65] },
] as const;

export const GOAL_CAT: Record<GoalCat, string> = {
  must: "Обязательные",
  want: "Желательные",
  extra: "Дополнительные",
};

export const GOALS_BOARD_LS_KEY = "tt.goals.board.v1";

export const GOAL_PHOTO: Record<string, string> = {
  teeth: "/goals/teeth.jpg",
  ring: "/goals/ring.jpg",
  iphone: "/goals/iphone.jpg",
  spb: "/goals/spb.jpg",
  party: "/goals/party.webp",
  mac: "/goals/macbook.jpg",
};

export const GOAL_PHOTO_POS: Record<string, string> = {
  teeth: "center 42%",
  ring: "center 45%",
  iphone: "center 45%",
  spb: "center 85%",
  party: "center 62%",
  mac: "center 72%",
};

export const RING_GOAL_ID = "ring";
export const RING_GOAL_URL = "https://www.585zolotoy.ru/catalog/products/9004449/";
export const RING_GOAL: LifeGoal = {
  id: RING_GOAL_ID,
  c: "must",
  t: "Кольцо SMART DIAMONDS",
  p: 65_994,
  v: 0,
  note: "Прям важно.\nРазмер 16,5 · красное золото 585\nhttps://www.585zolotoy.ru/catalog/products/9004449/",
};

export function lifeGoalProgress(goal: LifeGoal, board: GoalsBoard, balances: Record<FundKey, number>) {
  const shared = goal.c !== "must";
  const target = goal.fund === "cush" ? board.targets.cush : goal.p;
  const have = goal.fund === "cush" ? balances.cush : shared ? balances.wish : goal.v;
  const pct = target ? Math.min(100, Math.round((have / target) * 100)) : 0;
  return { have, target, pct, left: Math.max(0, target - have), shared: shared && !goal.fund };
}

const CATS = new Set<GoalCat>(["must", "want", "extra"]);

export function tierFromCushion(amount: number): number {
  if (amount < 360_000) return 0;
  if (amount < 540_000) return 1;
  if (amount < 720_000) return 2;
  return 3;
}

export function defaultGoalsBoard(): GoalsBoard {
  return {
    flow: 0,
    targets: { cush: 720_000, est: 3_000_000 },
    goals: [
      { id: "cush", c: "must", t: "Подушка безопасности", p: 0, v: 0, fund: "cush", noimg: true },
      { id: "teeth", c: "must", t: "Привести в порядок зубы", p: 100_000, v: 0 },
      { ...RING_GOAL },
      { id: "iphone", c: "want", t: "Айфон", p: 120_000, v: 0 },
      { id: "spb", c: "want", t: "Съездить в Питер с Лерой", p: 100_000, v: 0 },
      { id: "party", c: "want", t: "Сходить в стрипуху с Лерой или на секс-вечеринку", p: 40_000, v: 0 },
      { id: "mac", c: "want", t: "Макбук", p: 100_000, v: 0 },
      { id: "gym", c: "extra", t: "Форма для тренировок", p: 5_000, v: 0 },
      { id: "iron", c: "extra", t: "Утюг", p: 5_000, v: 0 },
      { id: "wardrobe", c: "extra", t: "обновление гардероба", p: 50_000, v: 0 },
    ],
  };
}

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function sanitizeGoalsBoard(input: unknown): GoalsBoard {
  const base = defaultGoalsBoard();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<GoalsBoard>;
  const targets = raw.targets && typeof raw.targets === "object" ? raw.targets : base.targets;
  const goals = Array.isArray(raw.goals) ? raw.goals.slice(0, 80).map(sanitizeGoal).filter((g): g is LifeGoal => Boolean(g)) : base.goals;
  if (!goals.some((g) => g.id === "cush")) {
    goals.unshift(base.goals[0]!);
  }
  ensureRingGoal(goals);
  return {
    flow: money(raw.flow),
    targets: {
      cush: money(targets.cush) || base.targets.cush,
      est: money(targets.est) || base.targets.est,
    },
    goals,
  };
}

function ensureRingGoal(goals: LifeGoal[]) {
  if (goals.some((g) => g.id === RING_GOAL_ID)) return;
  const teethIdx = goals.findIndex((g) => g.id === "teeth");
  const insertAt = teethIdx >= 0 ? teethIdx + 1 : Math.min(1, goals.length);
  goals.splice(insertAt, 0, { ...RING_GOAL });
}

function sanitizeGoal(input: unknown): LifeGoal | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<LifeGoal>;
  const id = String(raw.id ?? "").trim().slice(0, 40);
  if (!id) return null;
  const c = CATS.has(raw.c as GoalCat) ? (raw.c as GoalCat) : "want";
  const goal: LifeGoal = {
    id,
    c,
    t: String(raw.t ?? "").slice(0, 200),
    p: money(raw.p),
    v: money(raw.v),
  };
  if (raw.fund === "cush") goal.fund = "cush";
  if (raw.noimg) goal.noimg = true;
  if (raw.done) goal.done = true;
  if (raw.dd) goal.dd = String(raw.dd).slice(0, 40);
  if (raw.paid) goal.paid = money(raw.paid);
  if (raw.note) goal.note = String(raw.note).slice(0, 2000);
  return goal;
}
