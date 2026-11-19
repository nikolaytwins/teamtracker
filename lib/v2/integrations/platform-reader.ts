import fs from "fs";
import path from "path";
import { getAgencyRepo } from "@/lib/agency-store";
import { buildPlanPayload, loadPlanCalendarSlice } from "@/lib/v2/agency/plan/load-plan";
import { loadV2Dashboard } from "@/lib/v2/dashboard/load-dashboard";
import { loadFinanceAssistantContext } from "@/lib/v2/personal/finance-assistant/context";
import { loadFinanceDistributionRules } from "@/lib/v2/personal/finance-distribution-rules";
import { loadGoalsBoard } from "@/lib/v2/personal/goals-board-repo";
import { GOAL_CAT, defaultGoalsBoard, type GoalsBoard } from "@/lib/v2/personal/goals-board";
import {
  loadHypothesisArticle,
  type HypothesisArticleSlug,
} from "@/lib/v2/personal/hypothesis-articles";
import { STAGE_LABEL } from "@/lib/v2/personal/hypotheses-meta";
import {
  loadPersonalLifeDoc,
  type LifeDocKind,
} from "@/lib/v2/personal/life-docs-repo";
import { loadMoscowArticle } from "@/lib/v2/personal/moscow-article";
import { loadPersonalIdeasBoard } from "@/lib/v2/personal/personal-ideas-repo";
import {
  loadPersonalFinanceDashboard,
} from "@/lib/v2/personal/personal-finance-repo";
import { loadHypothesesBoard } from "@/lib/v2/personal/personal-hypotheses-repo";
import { isObservationType } from "@/lib/v2/personal/observations-meta";
import {
  loadPersonalObservationsBoard,
} from "@/lib/v2/personal/personal-observations-repo";
import { loadPersonalWishesBoard } from "@/lib/v2/personal/personal-wishes-repo";
import { loadWishlist } from "@/lib/v2/personal/personal-wishlist-repo";
import {
  LIFE_ARTICLES,
  LIFE_GOALS_DOC,
  LIFE_MF_DOC,
  LIFE_SX_DOC,
  type LifeMapBlock,
  type LifeMapDoc,
} from "@/lib/v2/personal/seeds/life-map-seed";
import { normalizeSportDoc, seedSportDoc, SP_GOAL } from "@/lib/v2/personal/seeds/sport-seed";
import { seedBrandDoc } from "@/lib/v2/personal/seeds/brand-seed";
import { seedLifeStrategyDoc } from "@/lib/v2/personal/seeds/life-strategy-seed";
import { seedMyCodeDoc } from "@/lib/v2/personal/seeds/mycode-seed";
import { normalizeTimeDoc, seedTimeDoc } from "@/lib/v2/personal/seeds/time-seed";
import type { V2SessionContext } from "@/lib/v2/types";

export type PlatformSection = {
  id: string;
  title: string;
  href: string;
  description: string;
};

export const PLATFORM_SECTIONS: PlatformSection[] = [
  { id: "home", title: "Главная", href: "/v2/home", description: "Сводка дня: финансы, задачи, фокус, стратегия" },
  { id: "revenue", title: "Выручка", href: "/v2/agency/overview", description: "Ожидаемая и фактическая выручка агентства за месяц" },
  { id: "plan", title: "План и задачи", href: "/v2/agency/plan", description: "Календарь плана и проекты на период" },
  { id: "finance", title: "Финансы", href: "/v2/personal/finance", description: "Счета, фонды, бюджет, доходы, правила" },
  { id: "hypotheses", title: "Гипотезы", href: "/v2/personal/hypotheses", description: "Доска гипотез: в работе, очередь, бэклог, проверено" },
  { id: "goals", title: "Цели", href: "/v2/personal/goals", description: "Доска целей и фонды накоплений" },
  { id: "important", title: "Важное", href: "/v2/personal/life-important", description: "Стратегия свободы, творчества и капитала 2026–2029" },
  { id: "articles", title: "Статьи", href: "/v2/personal/articles", description: "Список статей и длинных текстов" },
  { id: "sport", title: "Спорт", href: "/v2/personal/sport", description: "Метрики, недели, программа тренировок" },
  { id: "diary", title: "Дневник", href: "/v2/personal/observations", description: "Записи дневника и выводы" },
  { id: "wishes", title: "Желания", href: "/v2/personal/wishes", description: "Карточки желаний и категории" },
  { id: "wishlist", title: "Хотелки", href: "/v2/personal/goals", description: "Список хотелок с ценами" },
  { id: "ideas", title: "Идеи", href: "/v2/personal/ideas", description: "Банк идей и теги" },
  { id: "life_goals", title: "Главные цели жизни", href: "/v2/personal/life-goals", description: "Карта жизни · цели" },
  { id: "manifestations", title: "Проявления", href: "/v2/personal/manifestations", description: "Карта жизни · проявления" },
  { id: "sexuality", title: "Сексуальность", href: "/v2/personal/sexuality", description: "Карта жизни · сексуальность" },
  { id: "moscow", title: "Москва", href: "/v2/personal/moscow", description: "Статья про закрепление в Москве" },
  { id: "mycode", title: "Мой код", href: "/v2/personal/my-code", description: "Паттерны и правила поведения" },
  { id: "brand", title: "Бренд", href: "/v2/personal/brand", description: "Документ личного бренда" },
  { id: "time", title: "Время", href: "/v2/personal/time", description: "Документ про время и ритм" },
];

const ARTICLE_SLUGS = new Set<HypothesisArticleSlug>([
  "rostov-content-plan",
  "rostov-ugc",
  "impulse-nexus",
  "inner-critic",
  "ai-courses",
  "copernicus",
  "clips",
  "ege-tutor",
]);

function money(n: number) {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

function ymd(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthBounds(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function clip(text: string, limit: number) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

function matchQuery(haystack: string, q?: string) {
  if (!q?.trim()) return true;
  return haystack.toLowerCase().includes(q.trim().toLowerCase());
}

function formatLifeMap(doc: LifeMapDoc): string {
  const lines: string[] = [
    `# ${doc.title}`,
    doc.eyebrow,
    "",
    doc.lead,
    "",
  ];
  if (doc.chips.length) {
    lines.push(`Чипы: ${doc.chips.map((c) => `${c.n} ${c.t}`).join(" · ")}`, "");
  }
  for (const block of doc.blocks) {
    lines.push(...formatLifeBlock(block), "");
  }
  return lines.join("\n").trim();
}

function formatLifeBlock(block: LifeMapBlock): string[] {
  switch (block.type) {
    case "h2":
      return [`## ${block.eb ? `${block.eb} · ` : ""}${block.t}`];
    case "h3":
      return [`### ${block.t}`];
    case "p":
    case "lead":
      return [block.t];
    case "quote":
    case "mantra":
      return [`> ${block.t}`];
    case "bullets":
      return block.list.map((item) => `• ${item}`);
    case "facts":
      return block.list.map((item) => `• ${item.k}: ${item.v}`);
    case "figs":
      return block.list.map((item) => `• ${item.v} — ${item.l}`);
    case "items":
      return block.list.flatMap((item) => {
        const extra = item.d?.length ? `\n  ${item.d.join("\n  ")}` : "";
        const kv = item.kv?.length ? `\n  ${item.kv.map((x) => `${x.k}: ${x.v}`).join("; ")}` : "";
        return [`• ${item.n}: ${item.t}${extra}${kv}`];
      });
    case "note":
      return [
        `Заметка · ${block.label}: ${block.title}`,
        ...block.t.map((line) => `  ${line}`),
        ...(block.crit ? [`  Критерий: ${block.crit}`] : []),
      ];
    case "pair":
      return [`[пара изображений ${block.a} / ${block.b}]`];
    case "img":
      return [`[изображение ${block.id}]`];
    default:
      return [];
  }
}

function extractJsxReadableText(sourcePath: string): string {
  const raw = fs.readFileSync(sourcePath, "utf8");
  const start = raw.indexOf("return (");
  let s = start >= 0 ? raw.slice(start) : raw;
  s = s.replace(/\{sx\([^}]*\}\)/g, " ");
  s = s.replace(/\{[^}]*\}/g, " ");
  s = s.replace(/<[^>]+>/g, "\n");
  s = s.replace(/&nbsp;/g, " ");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ \t]{2,}/g, " ");
  return s.trim();
}

function formatGoalsBoard(board: GoalsBoard): string {
  const lines = [
    "# Цели",
    `Поток месяца: ${money(board.flow)}`,
    `Цель подушки: ${money(board.targets.cush)}`,
    `Цель недвижимости: ${money(board.targets.est)}`,
    "",
  ];
  for (const cat of ["must", "want", "extra"] as const) {
    const goals = board.goals.filter((g) => g.c === cat);
    if (!goals.length) continue;
    lines.push(`## ${GOAL_CAT[cat]}`);
    for (const g of goals) {
      const status = g.done ? "готово" : "в процессе";
      lines.push(
        `• ${g.t} — цена ${money(g.p)}, накоплено ${money(g.v)} (${status})` +
          (g.note ? `\n  ${g.note}` : ""),
      );
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

async function readHome(ctx: V2SessionContext) {
  const d = await loadV2Dashboard(ctx);
  const lines = [
    `# Главная · ${d.now.monthLabel} · ${d.now.dateYmd}`,
    "",
    "## Стратегия",
    d.strategy.currentFocus
      ? `Сейчас (${d.strategy.currentFocus.month}): ${d.strategy.currentFocus.headline}\n${d.strategy.currentFocus.items.map((i) => `  • ${i}`).join("\n")}`
      : "Текущий фокус не задан",
    d.strategy.nextFocus
      ? `Дальше (${d.strategy.nextFocus.month}): ${d.strategy.nextFocus.headline}`
      : "",
    d.strategy.bans.length ? `Запреты: ${d.strategy.bans.map((b) => b.title).join("; ")}` : "",
    d.strategy.principles.length
      ? `Принципы: ${d.strategy.principles.map((p) => p.title).join("; ")}`
      : "",
    "",
    "## Личные финансы",
  ];
  if (d.personal.finance) {
    const f = d.personal.finance;
    lines.push(
      `Свободные: ${money(f.disposable)}`,
      `Капитал: ${money(f.netWorth)}`,
      `Бюджет: ${money(f.budgetSpent)} / ${money(f.budgetLimit)} (осталось ${money(f.budgetLeft)})`,
      `Прибыль месяца: ${money(f.monthProfit)}`,
      `Доход получен / ожидание: ${money(f.incomeReceived)} / ${money(f.incomeExpected)}`,
      `Прогноз дельта: ${money(f.forecastDelta)}`,
    );
  } else {
    lines.push("Нет данных");
  }
  lines.push(
    "",
    "## Задачи",
    `Входящие ${d.personal.todos.inbox}, сегодня ${d.personal.todos.today}, просрочено ${d.personal.todos.overdue}`,
  );
  for (const t of d.personal.todayTodos) {
    lines.push(`• ${t.title}${t.due_date ? ` (${t.due_date})` : ""}`);
  }
  if (d.personal.weekFocus) {
    lines.push("", "## Фокус недели", d.personal.weekFocus.result_title || "—");
    for (const g of d.personal.weekFocus.goals ?? []) {
      lines.push(`• ${g.title}${g.completed_at ? " ✓" : ""}`);
    }
  }
  if (d.agency?.summary) {
    const s = d.agency.summary;
    lines.push(
      "",
      "## Агентство",
      `Выручка ожид./факт: ${money(s.expectedRevenue)} / ${money(s.actualRevenue)}`,
      `Прибыль: ${money(s.profit)} · расходы ${money(s.totalExpenses)}`,
    );
  }
  if (d.team) {
    lines.push(
      "",
      "## Команда",
      `Активные проекты: ${d.team.activeProjects}, открытые задачи: ${d.team.openTasks}, просрочено: ${d.team.overdueTasks}`,
    );
  }
  return lines.filter(Boolean).join("\n");
}

async function readRevenue(year: number, month: number) {
  const r = await getAgencyRepo().getAgencyProfitForMonth(year, month);
  return [
    `# Выручка · ${month}.${year}`,
    `Ожидаемая выручка: ${money(r.expectedRevenue)}`,
    `Фактическая выручка: ${money(r.actualRevenue)}`,
    `Расходы: ${money(r.totalExpenses)}`,
    `Ожидаемая прибыль: ${money(r.expectedProfit)}`,
    `Фактическая прибыль: ${money(r.actualProfit)}`,
  ].join("\n");
}

async function readPlan(ctx: V2SessionContext, from: string, to: string, year: number, month: number) {
  const [plan, calendar] = await Promise.all([
    buildPlanPayload(ctx, year, month, from, to),
    loadPlanCalendarSlice(ctx, from, to),
  ]);
  const lines = [
    `# План · ${from} — ${to}`,
    "",
    "## Проекты",
  ];
  for (const p of plan.projects.slice(0, 40)) {
    lines.push(
      `• ${p.name} [${p.businessLineLabel}] статус=${p.dispatchWorkStatus}; сумма=${money(p.effectiveTotalAmount)}; оплачено=${money(p.paidAmount)}` +
        (p.workDeadline ? `; дедлайн=${p.workDeadline}` : ""),
    );
  }
  lines.push("", "## Слоты календаря");
  for (const item of calendar.items.slice(0, 80)) {
    lines.push(
      `• ${item.plan_date} ${item.title || "без названия"}${item.project_id ? ` (project ${item.project_id})` : ""}` +
        (item.work_status ? ` · ${item.work_status}` : ""),
    );
  }
  if (calendar.backlog.length) {
    lines.push("", "## Бэклог без даты");
    for (const item of calendar.backlog.slice(0, 40)) {
      lines.push(`• ${item.title || "без названия"}`);
    }
  }
  return lines.join("\n");
}

async function readFinance(ctx: V2SessionContext, year: number, month: number) {
  const [dash, assistant, rules] = await Promise.all([
    loadPersonalFinanceDashboard(ctx, year, month),
    loadFinanceAssistantContext(ctx),
    Promise.resolve(loadFinanceDistributionRules()),
  ]);
  const lines = [
    `# Финансы · ${month}.${year}`,
    `Капитал: ${money(dash.summary.netWorth)}`,
    `Свободные: ${money(dash.summary.disposable)}`,
    `Прибыль месяца: ${money(dash.summary.monthProfit)}`,
    `Доход получен/ожидание: ${money(dash.summary.incomeReceived)} / ${money(dash.summary.incomeExpected)}`,
    `Бюджет: ${money(dash.summary.budgetSpent)} / ${money(dash.budget.limit_rub)}`,
    `Ожидаемые расходы: ${money(dash.summary.expectedExpenses)}`,
    `Прогноз дельта: ${money(dash.summary.forecastDelta)}`,
    "",
    "## Счета",
    ...dash.accounts.map(
      (a) =>
        `• ${a.name}: ${money(Number(a.balance_rub) || 0)}${a.currency_code !== "RUB" ? ` (${a.currency_code})` : ""}${a.disposable ? " · расходный" : ""}`,
    ),
    "",
    "## Фонды",
    ...assistant.funds.map((f) => `• ${f.name} (${f.fund_key}): ${money(f.amount_rub)}`),
    "",
    "## Доходы месяца",
    ...(dash.incomes.length
      ? dash.incomes.map(
          (i) =>
            `• ${i.title || "доход"}: ${money(i.amount_rub)}${i.status === "received" ? " · получено" : " · ожидание"}`,
        )
      : ["• нет"]),
    "",
    "## Правила распределения",
    clip(rules.body, 6000),
  ];
  return lines.join("\n");
}

async function readHypotheses(ctx: V2SessionContext, q?: string, limit = 80) {
  const board = await loadHypothesesBoard(ctx);
  const projectName = new Map(board.projects.map((p) => [p.id, p.name]));
  const sprintName = new Map(board.sprints.map((s) => [s.id, s.name]));
  const lines = ["# Гипотезы", ""];
  for (const stage of ["active", "queue", "backlog", "done"] as const) {
    const items = board.hypotheses
      .filter((h) => h.stage === stage)
      .filter((h) => matchQuery(`${h.title}\n${h.body}\n${h.metric}`, q))
      .slice(0, limit);
    if (!items.length) continue;
    lines.push(`## ${STAGE_LABEL[stage]}`);
    for (const h of items) {
      lines.push(
        `• [${h.id}] ${h.title}` +
          (h.project_id ? ` · ${projectName.get(h.project_id) || h.project_id}` : "") +
          (h.sprint_id ? ` · спринт ${sprintName.get(h.sprint_id) || h.sprint_id}` : ""),
      );
      if (h.body.trim()) lines.push(`  ${clip(h.body.replace(/\n+/g, " "), 500)}`);
      if (h.metric.trim()) lines.push(`  Критерий: ${h.metric}`);
      if (h.stage === "done" && (h.verdict || h.result_text)) {
        lines.push(`  Вердикт: ${h.verdict || "—"} · ${clip(h.result_text, 300)}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n").trim() || "Гипотез не найдено.";
}

async function readDiary(ctx: V2SessionContext, opts: { q?: string; type?: string; limit?: number; from?: string; to?: string }) {
  const type =
    opts.type && opts.type !== "all" && isObservationType(opts.type) ? opts.type : "all";
  const board = await loadPersonalObservationsBoard(ctx, {
    type,
    q: opts.q || "",
    from: opts.from,
    to: opts.to,
  });
  const limit = opts.limit ?? 40;
  const lines = [
    `# Дневник · всего ${board.observations.length}`,
    `Типы: ${Object.entries(board.counts).map(([k, v]) => `${k}:${v}`).join(", ") || "—"}`,
    `Теги: ${board.tags.slice(0, 30).map((t) => `#${t.name}(${t.count})`).join(" ") || "—"}`,
    "",
  ];
  for (const o of board.observations.slice(0, limit)) {
    lines.push(
      `## [${o.id}] ${o.title || "без заголовка"} · ${o.type} · ${o.observed_at}`,
      o.tags.length ? `Теги: ${o.tags.map((t) => `#${t}`).join(" ")}` : "",
      clip(o.body, 1200),
      o.why ? `Почему: ${o.why}` : "",
      "",
    );
  }
  return lines.filter((l) => l !== undefined).join("\n").trim();
}

async function readSport(ctx: V2SessionContext) {
  const doc = normalizeSportDoc(await loadPersonalLifeDoc(ctx, "sport", seedSportDoc));
  const lines = [
    "# Спорт",
    `Цель: ${SP_GOAL.raw}`,
    "",
    "## Недели",
  ];
  for (const w of doc.weeks.slice(-12)) {
    const avg = w.avg;
    lines.push(
      `• ${w.label}${w.dates ? ` (${w.dates})` : ""}` +
        (avg?.w != null ? ` · вес ${avg.w}` : "") +
        (avg?.f != null ? ` · жир ${avg.f}` : "") +
        (avg?.l != null ? ` · lean ${avg.l}` : "") +
        (w.kcal != null ? ` · ${w.kcal} ккал` : "") +
        (w.note ? ` — ${w.note}` : ""),
    );
  }
  lines.push("", "## Программа");
  for (const day of doc.program) {
    lines.push(`### ${day.name} · ${day.focus}`);
    for (const ex of day.ex) {
      lines.push(`• ${ex.n}: ${ex.sets}×${ex.reps}${ex.w ? ` @ ${ex.w}` : ""}${ex.goal ? ` → ${ex.goal}` : ""}`);
    }
  }
  if (doc.strategy.length) {
    lines.push("", "## Стратегия");
    for (const s of doc.strategy) {
      lines.push(`### ${s.h}`, s.t, "");
    }
  }
  return lines.join("\n").trim();
}

async function readLifeDoc(ctx: V2SessionContext, kind: LifeDocKind) {
  const seed = (): Record<string, unknown> => {
    switch (kind) {
      case "time":
        return normalizeTimeDoc(seedTimeDoc()) as unknown as Record<string, unknown>;
      case "brand":
        return seedBrandDoc() as unknown as Record<string, unknown>;
      case "life_strategy":
        return seedLifeStrategyDoc() as unknown as Record<string, unknown>;
      case "mycode":
        return seedMyCodeDoc() as unknown as Record<string, unknown>;
      case "sport":
        return normalizeSportDoc(seedSportDoc()) as unknown as Record<string, unknown>;
    }
  };
  const doc = await loadPersonalLifeDoc(ctx, kind, seed);
  const normalized =
    kind === "time"
      ? normalizeTimeDoc(doc)
      : kind === "sport"
        ? normalizeSportDoc(doc)
        : doc;
  return `# ${kind}\n\n${clip(JSON.stringify(normalized, null, 2), 18000)}`;
}

export function listPlatformSections(): PlatformSection[] {
  return PLATFORM_SECTIONS;
}

export type ReadPlatformParams = {
  section: string;
  q?: string;
  id?: string;
  slug?: string;
  type?: string;
  from?: string;
  to?: string;
  year?: number;
  month?: number;
  limit?: number;
};

export async function readPlatformSection(
  ctx: V2SessionContext,
  params: ReadPlatformParams,
): Promise<{ section: string; title: string; text: string }> {
  const now = new Date();
  const year = params.year && Number.isFinite(params.year) ? params.year : now.getFullYear();
  const month =
    params.month && params.month >= 1 && params.month <= 12 ? params.month : now.getMonth() + 1;
  const { from: monthFrom, to: monthTo } = monthBounds(year, month);
  const from = params.from || monthFrom;
  const to = params.to || (params.from ? addDays(params.from, 6) : monthTo);
  const section = params.section.trim().toLowerCase();
  const meta = PLATFORM_SECTIONS.find((s) => s.id === section);

  let text = "";
  let title = meta?.title || section;

  switch (section) {
    case "home":
      text = await readHome(ctx);
      break;
    case "revenue":
    case "agency":
    case "overview":
      text = await readRevenue(year, month);
      title = "Выручка";
      break;
    case "plan":
      text = await readPlan(ctx, from, to, year, month);
      break;
    case "finance":
      text = await readFinance(ctx, year, month);
      break;
    case "hypotheses":
      text = await readHypotheses(ctx, params.q, params.limit ?? 100);
      break;
    case "hypothesis": {
      if (!params.id) throw new PlatformReaderError("Для hypothesis нужен id");
      const board = await loadHypothesesBoard(ctx);
      const h = board.hypotheses.find((item) => item.id === params.id);
      if (!h) throw new PlatformReaderError("Гипотеза не найдена");
      title = h.title;
      text = [
        `# ${h.title}`,
        `id: ${h.id}`,
        `стадия: ${STAGE_LABEL[h.stage]}`,
        h.metric ? `критерий: ${h.metric}` : "",
        "",
        h.body || "—",
        h.result_text ? `\nВывод: ${h.result_text}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      break;
    }
    case "goals": {
      const page = await loadGoalsBoard(ctx);
      text = formatGoalsBoard(page.board ?? defaultGoalsBoard());
      break;
    }
    case "important": {
      const file = path.join(
        process.cwd(),
        "components/v2/personal/important/important-strategy-page.tsx",
      );
      text = `# Важное\n\n${extractJsxReadableText(file)}`;
      break;
    }
    case "articles": {
      if (params.slug && ARTICLE_SLUGS.has(params.slug as HypothesisArticleSlug)) {
        const article = loadHypothesisArticle(params.slug as HypothesisArticleSlug);
        title = article.title;
        text = `# ${article.title}\n\n${article.body}`;
        break;
      }
      text = [
        "# Статьи",
        "",
        ...LIFE_ARTICLES.map(
          (a) =>
            `• ${a.label}: ${a.title}\n  ${a.lead}\n  ${a.href}${a.href.includes("/articles/") ? ` · slug=${a.href.split("/").pop()}` : ""}`,
        ),
        "",
        "Чтобы прочитать markdown-статью: section=articles&slug=impulse-nexus|rostov-content-plan|rostov-ugc|inner-critic|ai-courses|copernicus|clips|ege-tutor",
        "Длинные страницы: important, life_goals, manifestations, sexuality, moscow",
      ].join("\n");
      break;
    }
    case "article": {
      if (!params.slug || !ARTICLE_SLUGS.has(params.slug as HypothesisArticleSlug)) {
        throw new PlatformReaderError(
          "Нужен slug: rostov-content-plan | rostov-ugc | impulse-nexus | inner-critic | ai-courses | copernicus | clips | ege-tutor",
        );
      }
      const article = loadHypothesisArticle(params.slug as HypothesisArticleSlug);
      title = article.title;
      text = `# ${article.title}\n\n${article.body}`;
      break;
    }
    case "sport":
      text = await readSport(ctx);
      break;
    case "diary":
    case "observations":
      text = await readDiary(ctx, {
        q: params.q,
        type: params.type,
        limit: params.limit,
        from: params.from,
        to: params.to,
      });
      title = "Дневник";
      break;
    case "wishes": {
      const board = await loadPersonalWishesBoard(ctx);
      const lines = ["# Желания", ""];
      for (const w of board.wishes.slice(0, params.limit ?? 80)) {
        if (!matchQuery(`${w.title}\n${w.description}\n${w.note}`, params.q)) continue;
        lines.push(
          `• ${w.title}${w.scale ? ` · ${w.scale}` : ""}${w.is_near ? " · ближайшее" : ""}`,
        );
        if (w.description) lines.push(`  ${clip(w.description, 400)}`);
        if (w.note) lines.push(`  Заметка: ${clip(w.note, 300)}`);
      }
      text = lines.join("\n");
      break;
    }
    case "wishlist": {
      const items = await loadWishlist(ctx);
      text = [
        "# Хотелки",
        ...items.map(
          (i) =>
            `• ${i.title}: ${money(i.price_rub)} · статус=${i.status}` +
              (i.saved_rub ? ` · накоплено ${money(i.saved_rub)}` : ""),
        ),
      ].join("\n");
      break;
    }
    case "ideas": {
      const board = await loadPersonalIdeasBoard(ctx);
      const lines = ["# Идеи", `Теги: ${board.tags.map((t) => `#${t.name}`).join(" ") || "—"}`, ""];
      for (const idea of board.ideas.slice(0, params.limit ?? 80)) {
        if (idea.archived_at) continue;
        if (!matchQuery(`${idea.title}\n${idea.body}`, params.q)) continue;
        lines.push(`• ${idea.title}${idea.pinned ? " · pin" : ""}`);
        if (idea.body) lines.push(`  ${clip(idea.body, 400)}`);
      }
      text = lines.join("\n");
      break;
    }
    case "life_goals":
      text = formatLifeMap(LIFE_GOALS_DOC);
      break;
    case "manifestations":
      text = formatLifeMap(LIFE_MF_DOC);
      break;
    case "sexuality":
      text = formatLifeMap(LIFE_SX_DOC);
      break;
    case "moscow": {
      const article = loadMoscowArticle();
      title = article.title;
      text = `# ${article.title}\n\n${article.body}`;
      break;
    }
    case "mycode":
      text = await readLifeDoc(ctx, "mycode");
      break;
    case "brand":
      text = await readLifeDoc(ctx, "brand");
      break;
    case "time":
      text = await readLifeDoc(ctx, "time");
      break;
    case "life_strategy":
      text = await readLifeDoc(ctx, "life_strategy");
      title = "Стратегия жизни";
      break;
    default:
      throw new PlatformReaderError(
        `Неизвестный раздел «${params.section}». Доступны: ${PLATFORM_SECTIONS.map((s) => s.id).join(", ")}, hypothesis, article, life_strategy`,
      );
  }

  if (params.q?.trim() && !["hypotheses", "diary", "observations", "wishes", "ideas"].includes(section)) {
    const parts = text.split(/\n{2,}/).filter((part) => matchQuery(part, params.q));
    if (parts.length) text = parts.join("\n\n");
  }

  return { section, title, text: clip(text, 24000) };
}

export class PlatformReaderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlatformReaderError";
  }
}
