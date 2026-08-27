/**
 * Генерирует standalone HTML макета /v2/home для редизайна.
 * Запуск: npx tsx scripts/generate-home-standalone-html.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { formatRub } from "../lib/v2/finance/meta";
import {
  HOME_BETS,
  HOME_CHECKS,
  HOME_LILA_BAN,
  HOME_MONTHS,
  HOME_NOT_NOW,
  HOME_RULES,
  HOME_RULE_CONTRAST,
  HOME_SEASON,
  HOME_SPRINT,
  HOME_SPRINT_GOALS,
  HOME_TRAININGS,
  HOME_VIDEO,
  HOME_VIDEO_ST,
  homeFmt,
} from "../lib/v2/personal/seeds/home-seed";

const HERO_BLUE = "#2d5eef";
const OUT = join(process.cwd(), "design", "Тим Трекер - Главная (standalone).html");

const FINANCE = {
  expectedRevenue: 319_000,
  actualRevenue: 0,
  totalExpenses: 190_000,
  manualGeneralExpenses: 120_000,
  projectExpenses: 45_000,
  taxAmount: 25_000,
  profit: 129_000,
  margin: 40,
  projectCount: 9,
  monthLabel: "август 2026",
};

const WEEK_FOCUS = {
  label: "24–30 августа",
  result_title: "Закрыть модуль 9 и подготовить переезд",
  goals: [
    { title: "Монтаж и публикация модуля 9", priority: "high", done: false },
    { title: "Список решений по переезду", priority: "medium", done: true },
    { title: "Выставить счета по 4 проектам", priority: "high", done: false },
    { title: "Один творческий день без экрана", priority: "low", done: false },
  ],
};

const CALENDAR_DAYS = [
  { wd: "Пн", n: "24", today: false },
  { wd: "Вт", n: "25", today: false },
  { wd: "Ср", n: "26", today: false },
  { wd: "Чт", n: "27", today: true },
  { wd: "Пт", n: "28", today: false },
  { wd: "Сб", n: "29", today: false },
  { wd: "Вс", n: "30", today: false },
];

const CALENDAR_ITEMS: Record<string, { time?: string; title: string; color: string }[]> = {
  "26": [{ time: "23:59", title: "Монтаж и загрузка модуля 10", color: "#3B6FF7" }],
  "27": [{ time: "23:59", title: "Подготовка модуля 10", color: "#3B6FF7" }],
};

const PRIORITY: Record<string, { label: string; tint: string; bg: string }> = {
  high: { label: "обязательно", tint: "#B42318", bg: "#FEE4E2" },
  medium: { label: "желательно", tint: "#B54708", bg: "#FEF0C7" },
  low: { label: "можно не делать", tint: "#475467", bg: "#EAECF0" },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function videoOpacity(st: string): number {
  if (st === "опубликовано") return 1;
  if (st === "монтаж") return 0.7;
  return 0.28;
}

function parseViews(raw: string): number {
  if (!raw || raw === "—") return 0;
  const tys = raw.replace(",", ".").match(/([\d.]+)\s*тыс/i);
  if (tys) return Math.round(parseFloat(tys[1]!) * 1000);
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatViews(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1).replace(".", ",")} тыс`;
  }
  return homeFmt(n);
}

const published = HOME_VIDEO.yt.filter((v) => v.st === "опубликовано");
const editing = HOME_VIDEO.yt.filter((v) => v.st === "монтаж" || v.st === "сценарий");
const ideas = HOME_VIDEO.yt.filter((v) => v.st === "идея");
const viewsTotal = HOME_VIDEO.yt.reduce((s, v) => s + parseViews(v.views), 0);
const paidShare = FINANCE.expectedRevenue
  ? Math.round((FINANCE.actualRevenue / FINANCE.expectedRevenue) * 100)
  : 0;

const monthsHtml = HOME_MONTHS.map((x) => {
  const active = x.id === "prelude";
  const markers = (x.markers ?? [])
    .map(
      (m) => `
      <div class="marker ${active ? "marker--on" : ""}">
        <div class="marker-date">${esc(m.date)}${m.time ? ` · ${esc(m.time)}` : ""}</div>
        <div class="marker-text">${esc(m.text)}</div>
      </div>`
    )
    .join("");
  const focus = x.tasks
    .map(
      (f, i) => `
      <div class="focus-item ${active ? "focus-item--on" : ""}">
        <span class="focus-num">${String(i + 1).padStart(2, "0")}</span>
        <span>${esc(f.text)}</span>
      </div>`
    )
    .join("");
  return `
    <button type="button" class="month-card ${active ? "month-card--active" : ""}" data-month="${x.id}">
      <div class="month-top">
        <span class="month-tag">${esc(x.tag)}</span>
        ${x.state === "сейчас" ? `<span class="month-now ${active ? "month-now--on" : ""}">сейчас</span>` : ""}
      </div>
      <div class="month-label">${esc(x.label)}</div>
      <div class="month-headline">${esc(x.headline)}</div>
      <p class="month-lead">${esc(x.lead)}</p>
      ${markers ? `<div class="month-markers">${markers}</div>` : ""}
      ${x.warn ? `<p class="month-warn ${active ? "month-warn--on" : ""}">${esc(x.warn)}</p>` : ""}
      <div class="month-focus">${focus}</div>
    </button>`;
}).join("");

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Тим Трекер — Главная (standalone)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --v2-ink-900:#0a0a0b; --v2-ink-800:#18181b; --v2-ink-700:#27272a; --v2-ink-600:#52525b;
      --v2-ink-500:#71717a; --v2-ink-400:#a1a1aa; --v2-ink-300:#d4d4d8; --v2-ink-200:#e4e4e7;
      --v2-ink-100:#f4f4f5; --v2-ink-50:#fafafa; --v2-brand-50:#eff4ff; --v2-brand-500:#3b6ff7;
      --v2-brand-600:#2a56eb; --v2-brand-700:#2244d8;
      --v2-shadow-card:0 1px 2px rgba(16,24,40,.04),0 8px 24px -12px rgba(16,24,40,.08);
      --v2-shadow-cardHv:0 2px 6px rgba(16,24,40,.05),0 18px 40px -14px rgba(16,24,40,.16);
      --v2-shadow-soft:0 1px 2px rgba(16,24,40,.03),0 12px 36px -16px rgba(30,52,120,.12);
      --v2-shadow-glow:0 0 0 4px rgba(59,111,247,.1),0 6px 22px -8px rgba(59,111,247,.45);
      --hero-blue:${HERO_BLUE};
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,system-ui,sans-serif;background:linear-gradient(180deg,#f6f8fc 0%,#eef2f9 100%);color:var(--v2-ink-900);-webkit-font-smoothing:antialiased}
    .tnum{font-variant-numeric:tabular-nums}
    .tight{letter-spacing:-.022em}
    .tighter{letter-spacing:-.034em}
    .shell{display:flex;min-height:100vh}
    .sidebar{width:244px;flex-shrink:0;background:#fff;box-shadow:var(--v2-shadow-soft);padding:16px 12px;display:flex;flex-direction:column;gap:4px}
    .sidebar-logo{display:flex;align-items:center;gap:10px;padding:8px 10px;margin-bottom:8px}
    .sidebar-logo-mark{width:32px;height:32px;border-radius:12px;background:linear-gradient(135deg,var(--v2-brand-500),var(--v2-brand-600));box-shadow:var(--v2-shadow-glow)}
    .sidebar-logo-text{font-size:14px;font-weight:600}
    .sidebar-item{padding:8px 10px;border-radius:10px;font-size:13px;color:var(--v2-ink-600)}
    .sidebar-item--active{background:var(--v2-brand-50);color:var(--v2-brand-700);font-weight:600}
    .main{flex:1;min-width:0;overflow-y:auto}
    .page{padding:12px 32px 80px;display:flex;flex-direction:column;gap:24px}
    .topbar{display:flex;align-items:center;height:56px;gap:12px}
    .crumb{font-size:13px;color:var(--v2-ink-500);display:flex;gap:8px;align-items:center}
    .crumb strong{color:var(--v2-ink-900);font-weight:500}
    .topbar-actions{margin-left:auto;display:flex;gap:6px;align-items:center}
    .btn-white{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:12px;background:#fff;font-size:12.5px;font-weight:500;color:var(--v2-ink-700);box-shadow:var(--v2-shadow-card);border:none;cursor:pointer}
    .grid-4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .kpi{background:#fff;border-radius:16px;padding:16px;box-shadow:var(--v2-shadow-card);text-decoration:none;color:inherit;display:block}
    .kpi-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--v2-ink-400);display:flex;align-items:center;gap:8px}
    .kpi-icon{width:24px;height:24px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px}
    .kpi-value{font-size:24px;font-weight:600;margin-top:6px}
    .kpi-sub{font-size:11.5px;color:var(--v2-ink-500);margin-top:4px}
    .section-head{display:flex;align-items:baseline;gap:12px;margin-bottom:12px}
    .section-title{font-size:19px;font-weight:600}
    .section-sub{font-size:13px;color:var(--v2-ink-500)}
    .month-card{border:none;border-radius:16px;padding:20px;text-align:left;cursor:pointer;background:#fff;box-shadow:var(--v2-shadow-card);display:flex;flex-direction:column;transition:box-shadow .15s}
    .month-card--active{background:var(--hero-blue);color:#fff;box-shadow:var(--v2-shadow-soft)}
    .month-top{display:flex;gap:8px;align-items:center}
    .month-tag{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:var(--v2-ink-400)}
    .month-card--active .month-tag{color:rgba(255,255,255,.5)}
    .month-now{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;padding:2px 6px;border-radius:4px;background:var(--v2-brand-50);color:var(--v2-brand-700)}
    .month-now--on{background:rgba(255,255,255,.15);color:rgba(255,255,255,.8)}
    .month-label{font-size:22px;font-weight:600;margin-top:8px}
    .month-headline{font-size:16px;font-weight:500;margin-top:8px;line-height:1.35}
    .month-lead{font-size:13px;margin-top:8px;line-height:1.5;color:var(--v2-ink-500)}
    .month-card--active .month-lead{color:rgba(255,255,255,.6)}
    .month-markers{margin-top:12px;display:flex;flex-direction:column;gap:8px}
    .marker{border-radius:12px;padding:8px 10px;background:#fff1f2;color:#881337}
    .marker--on{background:rgba(255,255,255,.16);color:#fff}
    .marker-date{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:#e11d48}
    .marker--on .marker-date{color:rgba(255,255,255,.7)}
    .marker-text{font-size:13px;font-weight:600;margin-top:2px}
    .month-warn{margin-top:12px;border-radius:12px;padding:8px 10px;font-size:12.5px;font-weight:600;line-height:1.4;white-space:pre-wrap;background:#fffbeb;color:#92400e}
    .month-warn--on{background:rgba(251,191,36,.2);color:#fffbeb}
    .month-focus{margin-top:16px;padding-top:16px;border-top:1px solid var(--v2-ink-100);display:flex;flex-direction:column;gap:8px}
    .month-card--active .month-focus{border-color:rgba(255,255,255,.15)}
    .focus-item{display:flex;gap:10px;align-items:flex-start;border-radius:12px;padding:8px 10px;background:var(--v2-ink-50);font-size:14.5px;font-weight:500;line-height:1.35}
    .focus-item--on{background:rgba(255,255,255,.14);color:#fff}
    .focus-num{width:22px;height:22px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;background:#fff;color:var(--v2-ink-500);box-shadow:0 1px 2px rgba(0,0,0,.04);flex-shrink:0}
    .focus-item--on .focus-num{background:rgba(255,255,255,.18);color:#fff;box-shadow:none}
    .hero-blue{border-radius:16px;padding:32px;color:#fff;background:var(--hero-blue);box-shadow:var(--v2-shadow-soft)}
    .hero-kicker{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.45)}
    .hero-idea{font-size:30px;font-weight:500;line-height:1.28;margin-top:14px;max-width:52ch}
    .hero-foot{display:flex;align-items:center;gap:16px;margin-top:28px}
    .hero-bar{flex:1;max-width:420px;height:4px;border-radius:999px;background:rgba(255,255,255,.15);overflow:hidden}
    .hero-bar span{display:block;height:100%;border-radius:999px;background:rgba(255,255,255,.8)}
    .lila{display:flex;gap:28px;background:#fff;border-radius:16px;padding:28px 32px;box-shadow:0 1px 2px rgba(16,24,40,.03),0 12px 36px -16px rgba(30,52,120,.12),inset 3px 0 0 #dc2626}
    .lila-mark{width:56px;height:56px;border-radius:16px;background:#dc2626;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
    .focus-board{border-radius:16px;padding:24px 28px;color:#fff;background:var(--hero-blue);box-shadow:var(--v2-shadow-soft)}
    .focus-goals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:20px}
    .focus-goal{background:#fff;border-radius:12px;padding:12px 14px;box-shadow:var(--v2-shadow-card);position:relative}
    .focus-goal.done{opacity:.55}
    .prio{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;padding:2px 6px;border-radius:4px;display:inline-block}
    .goal-title{font-size:13.5px;margin-top:8px;line-height:1.35;color:var(--v2-ink-800)}
    .goal-title.done{text-decoration:line-through}
    .card{background:#fff;border-radius:16px;box-shadow:var(--v2-shadow-card)}
    .card-pad{padding:20px}
    .sprint-card,.bet-card{border-radius:16px;background:#fff;padding:20px;box-shadow:var(--v2-shadow-card);display:flex;flex-direction:column}
    .goal-box{border-radius:12px;padding:10px 12px;margin-top:12px}
    .not-now-item{display:flex;gap:10px;font-size:13.5px;color:var(--v2-ink-600);align-items:center}
    .v2-card{background:#fff;border-radius:16px;box-shadow:var(--v2-shadow-card);overflow:hidden}
    .cal-head{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid var(--v2-ink-100)}
    .cal-grid-head,.cal-grid-body{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
    .cal-grid-head{background:rgba(250,250,250,.7);border-bottom:1px solid var(--v2-ink-100)}
    .cal-grid-head div{padding:10px 8px;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--v2-ink-400)}
    .cal-cell{min-height:168px;padding:10px;border-right:1px solid var(--v2-ink-100);border-bottom:1px solid var(--v2-ink-100)}
    .cal-cell.today{background:var(--v2-brand-50)}
    .cal-day{width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
    .cal-day.today{background:var(--v2-brand-600);color:#fff;box-shadow:var(--v2-shadow-glow)}
    .cal-pill{margin-top:8px;border-radius:6px;padding:4px 6px;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .video-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--v2-ink-100);border-bottom:1px solid var(--v2-ink-100)}
    .video-stats div{background:#fff;padding:16px 20px}
    .rules-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin-top:16px}
    .rule-box{border-radius:12px;background:var(--v2-ink-50);padding:14px 16px}
    .note{font-size:11px;color:var(--v2-ink-400);margin-top:8px;padding:12px 16px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a}
    @media(max-width:1200px){.grid-4,.focus-goals,.rules-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  </style>
</head>
<body>
  <!--
    Standalone макет /v2/home для редизайна.
    Источник данных: lib/v2/personal/seeds/home-seed.ts
    После редизайна верните обновлённый HTML — перенесём в React-компоненты.
    Секции сверху вниз:
    1. KPI деньги (ProjectsMoneyStrip) — live API на проде
    2. Расписание сезона (MonthBand)
    3. Season hero · 4. Lila ban · 5. Week focus · 6. Sprint goals
    7. Season bets · 8. Not now · 9. Calendar week · 10. Video · 11. Rules
  -->
  <div class="shell">
    <aside class="sidebar" aria-label="Навигация (упрощённо)">
      <div class="sidebar-logo"><span class="sidebar-logo-mark"></span><span class="sidebar-logo-text">Team Tracker</span></div>
      <div class="sidebar-item sidebar-item--active">Главная</div>
      <div class="sidebar-item">Календарь</div>
      <div class="sidebar-item">Стратегия</div>
      <div class="sidebar-item">Агентство</div>
      <div class="sidebar-item">Личное</div>
    </aside>
    <main class="main">
      <div class="page">
        <header class="topbar">
          <div class="crumb"><strong>Главная</strong><span>/</span><span>${esc(HOME_SEASON.day)}</span></div>
          <div class="topbar-actions">
            <button type="button" class="btn-white">+ Запись в дневник</button>
            <button type="button" class="btn-white" style="width:36px;padding:0;justify-content:center">🔔</button>
          </div>
        </header>

        <!-- 1. KPI -->
        <section class="grid-4" data-section="finance-kpi">
          <a class="kpi" href="#"><div class="kpi-label"><span class="kpi-icon" style="background:#3B6FF714;color:#3B6FF7">◫</span>Предполагаемая выручка</div><div class="kpi-value tnum tighter">${formatRub(FINANCE.expectedRevenue)}</div><div class="kpi-sub">${FINANCE.projectCount} проектов · ${FINANCE.monthLabel}</div></a>
          <a class="kpi" href="#"><div class="kpi-label"><span class="kpi-icon" style="background:#0EA5A414;color:#0EA5A4">₽</span>Фактическая выручка</div><div class="kpi-value tnum tighter">${formatRub(FINANCE.actualRevenue)}</div><div class="kpi-sub">${paidShare}% оплачено</div></a>
          <a class="kpi" href="#"><div class="kpi-label"><span class="kpi-icon" style="background:#EF444414;color:#EF4444">▤</span>Расходы</div><div class="kpi-value tnum tighter" style="color:#ef4444">${formatRub(FINANCE.totalExpenses)}</div><div class="kpi-sub">${formatRub(FINANCE.manualGeneralExpenses + FINANCE.projectExpenses)} команда · ${formatRub(FINANCE.taxAmount)} налог</div></a>
          <a class="kpi" href="#"><div class="kpi-label"><span class="kpi-icon" style="background:#10B98114;color:#10B981">▥</span>Прибыль</div><div class="kpi-value tnum tighter" style="color:#10b981">${formatRub(FINANCE.profit)}</div><div class="kpi-sub">маржа ${Math.round(FINANCE.margin)}% · все направления</div></a>
        </section>

        <!-- 2. Season schedule -->
        <section data-section="month-band">
          <div class="section-head"><h2 class="section-title tight">Расписание сезона</h2><span class="section-sub">Четыре периода до Review. Клик — выбрать текущий.</span></div>
          <div class="grid-4">${monthsHtml}</div>
        </section>

        <!-- 3. Season hero -->
        <section class="hero-blue" data-section="season-hero">
          <div style="display:flex;gap:10px;align-items:center"><span class="hero-kicker">${esc(HOME_SEASON.kicker)}</span><span style="width:4px;height:4px;border-radius:999px;background:rgba(255,255,255,.25)"></span><span style="font-size:12px;color:rgba(255,255,255,.55)">${esc(HOME_SEASON.dates)}</span></div>
          <p class="hero-idea tight">${esc(HOME_SEASON.idea)}</p>
          <div class="hero-foot"><div class="hero-bar"><span style="width:${HOME_SEASON.progress * 100}%"></span></div><span style="font-size:12px;color:rgba(255,255,255,.45)">Review · ${esc(HOME_SEASON.review)}</span><a href="#" style="margin-left:auto;font-size:13px;color:rgba(255,255,255,.85);text-decoration:none">Стратегия →</a></div>
        </section>

        <!-- 4. Lila -->
        <section class="lila" data-section="lila-ban">
          <span class="lila-mark">${HOME_LILA_BAN.mark}</span>
          <div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:var(--v2-ink-400)">${esc(HOME_LILA_BAN.title)}</div><div style="font-size:24px;font-weight:600;margin-top:6px;max-width:46ch;line-height:1.25" class="tight">${esc(HOME_LILA_BAN.text)}</div><p style="margin-top:10px;font-size:15px;line-height:1.5;color:var(--v2-ink-500);max-width:62ch">${esc(HOME_LILA_BAN.note)}</p></div>
        </section>

        <!-- 5. Week focus -->
        <section class="focus-board" data-section="week-focus">
          <div style="display:flex;gap:12px;align-items:baseline;flex-wrap:wrap"><h2 style="font-size:19px;font-weight:600">Фокус недели</h2><span style="font-size:13px;color:rgba(255,255,255,.55)">${esc(WEEK_FOCUS.label)}</span><a href="#" style="margin-left:auto;font-size:12.5px;color:rgba(255,255,255,.85);text-decoration:none">Календарь →</a></div>
          <p style="font-size:26px;font-weight:600;margin-top:8px;max-width:56ch;line-height:1.3" class="tight">${esc(WEEK_FOCUS.result_title)}</p>
          <div class="focus-goals">
            ${WEEK_FOCUS.goals
              .map((g) => {
                const p = PRIORITY[g.priority]!;
                return `<div class="focus-goal ${g.done ? "done" : ""}"><div style="display:flex;gap:8px;align-items:center"><span style="width:16px;height:16px;border-radius:4px;background:${g.done ? "#10b981" : "var(--v2-ink-100)"};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:10px">${g.done ? "✓" : ""}</span><span class="prio" style="background:${p.bg};color:${p.tint}">${p.label}</span></div><p class="goal-title ${g.done ? "done" : ""}">${esc(g.title)}</p></div>`;
              })
              .join("")}
          </div>
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><input placeholder="Добавить фокус недели…" style="flex:1;min-width:260px;height:40px;border-radius:12px;border:none;background:rgba(255,255,255,.12);padding:0 14px;color:#fff;font-size:13.5px" /><select style="height:40px;border-radius:12px;border:none;background:rgba(255,255,255,.12);padding:0 12px;color:#fff;font-size:13px"><option>желательно</option></select><button class="btn-white" style="height:40px">+ Добавить</button></div>
        </section>

        <!-- 6. Sprint goals -->
        <section data-section="sprint-goals">
          <div class="section-head"><h2 class="section-title tight">${esc(HOME_SPRINT.label)}</h2><span class="section-sub">${esc(HOME_SPRINT.dates)}</span></div>
          <div class="grid-4">${HOME_SPRINT_GOALS.map(
            (g) => `<div class="sprint-card"><div style="display:flex;gap:8px;align-items:center"><span style="width:8px;height:8px;border-radius:999px;background:${g.tint}"></span><span style="font-size:15px;font-weight:600">${esc(g.name)}</span></div><div class="goal-box" style="background:${g.bg}"><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:${g.tint}">Цель</div><div style="font-size:14px;font-weight:500;margin-top:2px">${esc(g.goal)}</div></div>${g.items.map((it) => `<div style="margin-top:10px;font-size:13px;color:var(--v2-ink-600);display:flex;gap:10px"><span style="color:var(--v2-ink-400);width:16px">–</span>${esc(it)}</div>`).join("")}</div>`
          ).join("")}</div>
        </section>

        <!-- 7. Bets -->
        <section data-section="bets">
          <div class="section-head"><h2 class="section-title tight">Ставки сезона</h2><span class="section-sub">Главные гипотезы. Проверяются до 30 ноября.</span></div>
          <div class="grid-4" style="grid-template-columns:repeat(3,minmax(0,1fr))">${HOME_BETS.map(
            (b) => `<div class="bet-card"><div style="display:flex;gap:10px;align-items:center"><span style="width:32px;height:32px;border-radius:12px;background:${b.bg};display:flex;align-items:center;justify-content:center">${b.mark}</span><div><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:${b.tint}">${esc(b.kicker)}</div><div style="font-size:15px;font-weight:600">${esc(b.name)}</div></div></div><p style="margin-top:14px;font-size:14px;line-height:1.55;color:var(--v2-ink-800)">${esc(b.hyp)}</p><div style="margin-top:auto;padding-top:16px;display:flex;gap:12px;align-items:center"><span style="font-size:12px;color:var(--v2-ink-500)">${esc(b.horizon)}</span><a href="#" style="margin-left:auto;font-size:12px;color:var(--v2-brand-700);text-decoration:none">Открыть →</a></div></div>`
          ).join("")}</div>
        </section>

        <!-- 8. Not now -->
        <section class="card card-pad" data-section="not-now">
          <div class="section-head" style="margin-bottom:14px"><h3 class="section-title tight" style="font-size:15px">Не сейчас</h3><span class="section-sub">Решения, которые сознательно отложены до Review.</span></div>
          <div class="grid-4">${HOME_NOT_NOW.map((n) => `<div class="not-now-item"><span style="color:var(--v2-ink-300)">—</span>${esc(n)}</div>`).join("")}</div>
        </section>

        <!-- 9. Calendar week -->
        <section class="v2-card" data-section="calendar-week">
          <div class="cal-head"><div><h2 class="tight" style="font-size:18px;font-weight:700">Календарь недели</h2><p style="font-size:11px;color:var(--v2-ink-400);margin-top:2px">24 авг. — 30 авг.</p></div><a href="#" class="btn-white" style="font-size:12px;font-weight:600">Открыть календарь</a></div>
          <div class="cal-grid-head">${CALENDAR_DAYS.map((d) => `<div>${d.wd}</div>`).join("")}</div>
          <div class="cal-grid-body">${CALENDAR_DAYS.map((d) => {
            const items = CALENDAR_ITEMS[d.n] ?? [];
            return `<div class="cal-cell ${d.today ? "today" : ""}"><span class="cal-day tnum ${d.today ? "today" : ""}">${d.n}</span>${items.map((it) => `<div class="cal-pill tnum" style="color:${it.color};background:${it.color}14">${it.time ? it.time + " " : ""}${esc(it.title)}</div>`).join("")}</div>`;
          }).join("")}</div>
        </section>

        <!-- 10. Video -->
        <section class="v2-card" data-section="video">
          <div class="cal-head"><div><h2 class="tight" style="font-size:18px;font-weight:700">Ролики</h2><p style="font-size:11px;color:var(--v2-ink-400);margin-top:2px">${esc(HOME_VIDEO.question)}</p></div><a href="#" class="btn-white" style="font-size:12px;font-weight:600">Личный бренд</a></div>
          <div class="video-stats">
            <div><div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--v2-ink-400)">Опубликовано</div><div class="tnum tighter" style="font-size:26px;font-weight:600;margin-top:6px">${published.length}</div><div style="font-size:12px;color:var(--v2-ink-500);margin-top:6px">из ${HOME_VIDEO.goal} на YouTube</div></div>
            <div><div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--v2-ink-400)">В работе</div><div class="tnum tighter" style="font-size:26px;font-weight:600;margin-top:6px">${editing.length}</div><div style="font-size:12px;color:var(--v2-ink-500);margin-top:6px">монтаж и сценарий</div></div>
            <div><div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--v2-ink-400)">Идеи</div><div class="tnum tighter" style="font-size:26px;font-weight:600;margin-top:6px">${ideas.length}</div><div style="font-size:12px;color:var(--v2-ink-500);margin-top:6px">ещё не в производстве</div></div>
            <div><div style="font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--v2-ink-400)">Просмотры</div><div class="tnum tighter" style="font-size:26px;font-weight:600;margin-top:6px">${viewsTotal ? formatViews(viewsTotal) : "—"}</div><div style="font-size:12px;color:var(--v2-ink-500);margin-top:6px">сумма опубликованных</div></div>
          </div>
          <div style="display:flex;gap:4px;padding:16px 20px 0">${HOME_VIDEO.yt.map((v) => `<span style="flex:1;height:6px;border-radius:999px;background:${HOME_VIDEO_ST[v.st].tint};opacity:${videoOpacity(v.st)}"></span>`).join("")}</div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:20px">${HOME_VIDEO.yt
            .map((v) => {
              const s = HOME_VIDEO_ST[v.st];
              return `<article style="border:1px solid var(--v2-ink-100);border-radius:16px;padding:16px;opacity:${v.st === "идея" ? 0.85 : 1}"><div style="display:flex;gap:8px;align-items:center"><span class="tnum" style="font-size:11px;font-weight:600;color:var(--v2-ink-400)">${v.n}</span><span style="font-size:10.5px;font-weight:600;padding:3px 6px;border-radius:6px;background:${s.bg};color:${s.tint}">${v.st}</span><span class="tnum" style="margin-left:auto;font-size:12px;color:var(--v2-ink-400)">${esc(v.date)}</span></div><h3 class="tight" style="font-size:16px;font-weight:600;margin-top:10px;line-height:1.35">${esc(v.t)}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px"><div style="background:var(--v2-ink-50);border-radius:12px;padding:10px 12px"><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--v2-ink-400)">Просмотры</div><div class="tnum" style="font-size:15px;font-weight:600;margin-top:4px">${esc(v.views)}</div></div><div style="background:var(--v2-ink-50);border-radius:12px;padding:10px 12px"><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--v2-ink-400)">Отклик</div><div style="font-size:13px;font-weight:500;margin-top:4px;line-height:1.35">${esc(v.react)}</div></div></div></article>`;
            })
            .join("")}</div>
        </section>

        <!-- 11. Rules -->
        <section class="card card-pad" data-section="rules">
          <div class="section-head"><h2 class="section-title tight">Правила недели</h2><span class="section-sub">Рамки, а не производственный план.</span></div>
          <div class="rules-grid">${HOME_RULES.map((r, i) => `<div class="rule-box"><div class="tnum" style="font-size:10.5px;font-weight:600;color:var(--v2-ink-300)">${String(i + 1).padStart(2, "0")}</div><p class="tight" style="font-size:14px;line-height:1.35;margin-top:4px;color:var(--v2-ink-800)">${esc(r)}</p></div>`).join("")}</div>
          <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--v2-ink-100)"><div class="section-head" style="margin-bottom:12px"><h3 style="font-size:15px;font-weight:600">Минимум недели</h3><span class="section-sub">Сделал — можно отдыхать. Просто помню, не отмечаю.</span></div>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 24px">${HOME_CHECKS.map((c) => `<div class="not-now-item"><span style="color:var(--v2-ink-300)">—</span><span><strong style="display:block;font-size:13.5px;font-weight:500">${esc(c.label)}</strong><span style="font-size:11.5px;color:var(--v2-ink-500)">${esc(c.note)}</span></span></div>`).join("")}<div class="not-now-item"><span style="color:var(--v2-ink-300)">—</span><span><strong style="display:block;font-size:13.5px;font-weight:500">${esc(HOME_TRAININGS.label)}</strong><span style="font-size:11.5px;color:var(--v2-ink-500)">${HOME_TRAININGS.total} раза в неделю</span></span></div></div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px"><div style="background:#ecfdf5;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.5;color:#065f46">${esc(HOME_RULE_CONTRAST.ok)}</div><div style="background:var(--v2-ink-100);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.5;color:var(--v2-ink-600)">${esc(HOME_RULE_CONTRAST.no)}</div></div>
        </section>

        <p class="note">Макет сгенерирован из кода приложения. Переключение месяцев в «Расписании сезона» — клик по карточке. KPI и фокус недели на проде подгружаются из API; здесь — примерные значения.</p>
      </div>
    </main>
  </div>
  <script>
    document.querySelectorAll(".month-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".month-card").forEach((b) => b.classList.remove("month-card--active"));
        btn.classList.add("month-card--active");
      });
    });
  </script>
</body>
</html>`;

mkdirSync(join(process.cwd(), "design"), { recursive: true });
writeFileSync(OUT, html, "utf8");
console.log("Wrote", OUT);
