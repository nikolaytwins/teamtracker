/**
 * Генерирует standalone HTML макета «Транзакции» для редизайна.
 * Дизайн 1:1 из design/_source/transactions-template.html.
 * Расходы — из scripts/data/transactions-aug2026-export.json (prod, август 2026).
 * Поступления — по проектам из home-seed (agency, course, qmagic, arkalium, video).
 *
 * Обновить экспорт расходов с прода:
 *   ssh root@178.72.168.156 'set -a; source /etc/team-tracker.env; set +a; cd /opt/team-tracker; node scripts/export-transactions-seed.mjs' \
 *     > scripts/data/transactions-aug2026-export.json
 *
 * Запуск: npx tsx scripts/generate-transactions-standalone-html.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { HOME_TRACKS } from "../lib/v2/personal/seeds/home-seed";

const ROOT = process.cwd();
const TEMPLATE = join(ROOT, "design/_source/transactions-template.html");
const HERO = join(ROOT, "design/_source/transactions-hero.png");
const EXPORT = join(ROOT, "scripts/data/transactions-aug2026-export.json");
const OUT = join(ROOT, "design", "Тим Трекер - Транзакции (standalone).html");

type TxRow = [string, string, string, string, string, string, number, string, string, string];
type CatDef = { n: string; c: string; t: "in" | "out" };
type HistRow = { m: string; inc: number; out: number };

type ExportPayload = {
  rows: TxRow[];
  catDefs: Record<string, CatDef>;
  ih: HistRow[];
};

const INCOME_CATS: Record<string, CatDef> = {
  agency: { n: "Агентство", c: "#2A56EB", t: "in" },
  course: { n: "Курс · Импульс", c: "#0E7490", t: "in" },
  qmagic: { n: "Qmagic", c: "#7C3AED", t: "in" },
  arkalium: { n: "Аркалиум", c: "#6366F1", t: "in" },
  video: { n: "Ролики", c: "#C2410C", t: "in" },
};

/** Поступления по проектам — суммы agency/course из HOME_TRACKS. */
function buildIncomeRows(): TxRow[] {
  const agencyTarget = HOME_TRACKS.find((t) => t.id === "agency")?.money ?? 319_000;
  const courseTarget = HOME_TRACKS.find((t) => t.id === "course")?.money ?? 180_000;

  const agency: TxRow[] = [
    ["2026-08-26", "14:10", "in", "Сайт мангалы · Twin Labs", "Агентство · финальная оплата 50%", "agency", 85_000, "Расчётный счёт", "pending", "proj_mangaly_0826"],
    ["2026-08-22", "16:30", "in", "Брендинг кофейни", "Агентство · аванс 40%", "agency", 48_000, "Расчётный счёт", "paid", "proj_coffee_0822"],
    ["2026-08-20", "10:15", "in", "Презентация для EdTech", "Агентство · сдача проекта", "agency", 55_000, "Расчётный счёт", "pending", "proj_edtech_0820"],
    ["2026-08-15", "13:20", "in", "Корпоративный сайт", "Агентство · счёт выставлен", "agency", 72_000, "Счёт на оплату", "pending", "proj_corp_0815"],
    ["2026-08-05", "09:20", "in", "Twin Labs · редизайн", "Агентство · старт", "agency", 45_000, "Расчётный счёт", "pending", "proj_twin_0805"],
  ];
  const agencySum = agency.reduce((s, r) => s + r[6], 0);
  agency.push([
    "2026-08-01",
    "10:00",
    "in",
    "Агентство · доплаты",
    "Агентство · остаток по проектам",
    "agency",
    agencyTarget - agencySum,
    "Расчётный счёт",
    "pending",
    "proj_agency_topup",
  ]);

  const course: TxRow[] = [
    ["2026-08-18", "09:40", "in", "Импульс · Поток 1", "Курс · полная оплата", "course", 89_000, "ЮKassa", "paid", "proj_impulse_0818"],
    ["2026-08-12", "15:05", "in", "Импульс · рассрочка", "Курс · платёж 3/6", "course", 14_833, "T-Pay", "paid", "proj_impulse_0812"],
    ["2026-08-07", "11:00", "in", "Импульс · корпоратив", "Курс · B2B пакет", "course", 45_000, "Счёт на оплату", "paid", "proj_impulse_corp"],
  ];
  const courseSum = course.reduce((s, r) => s + r[6], 0);
  course.push([
    "2026-08-03",
    "16:00",
    "in",
    "Импульс · модуль 9",
    "Курс · доп. места",
    "course",
    courseTarget - courseSum,
    "ЮKassa",
    "paid",
    "proj_impulse_m9",
  ]);

  const other: TxRow[] = [
    ["2026-08-24", "11:00", "in", "Лендинг QMagic", "Qmagic · SaaS лендинг, этап 2", "qmagic", 62_000, "Расчётный счёт", "pending", "proj_qmagic_0824"],
    ["2026-08-02", "12:00", "in", "QMagic · демо", "Qmagic · прототип", "qmagic", 40_000, "Расчётный счёт", "pending", "proj_qmagic_0802"],
    ["2026-08-10", "11:30", "in", "Аркалиум · креатив", "Аркалиум · концепт", "arkalium", 35_000, "Расчётный счёт", "paid", "proj_ark_0810"],
    ["2026-08-08", "17:00", "in", "YouTube · ролик", "Ролики · монтаж", "video", 28_000, "Расчётный счёт", "paid", "proj_video_0808"],
  ];

  const hist: TxRow[] = [
    ["2026-07-28", "12:00", "in", "Агентство · сводка", "Июль · проекты", "agency", 280_000, "Расчётный счёт", "paid", "hist_jul_inc"],
    ["2026-06-25", "12:00", "in", "Агентство · сводка", "Июнь · проекты", "agency", 519_950, "Расчётный счёт", "paid", "hist_jun_inc"],
  ];

  return [...hist, ...agency, ...course, ...other];
}

function jsCats(cats: Record<string, CatDef>): string {
  const parts = Object.entries(cats).map(
    ([k, v]) => `${k}:{n:${JSON.stringify(v.n)},c:${JSON.stringify(v.c)},t:${JSON.stringify(v.t)}}`,
  );
  return `{${parts.join(",")}}`;
}

function jsSeed(rows: TxRow[]): string {
  return `[\n${rows.map((r) => `[${r.map((x) => JSON.stringify(x)).join(",")}]`).join(",\n")}\n]`;
}

function main() {
  const exportData: ExportPayload = JSON.parse(readFileSync(EXPORT, "utf-8"));
  const incomeRows = buildIncomeRows();
  const allRows = [...incomeRows, ...exportData.rows];
  const cats = { ...exportData.catDefs, ...INCOME_CATS };

  const hist = exportData.ih.map((h) =>
    h.m === "2026-08"
      ? { ...h, inc: incomeRows.filter((r) => r[0].startsWith("2026-08")).reduce((s, r) => s + r[6], 0) }
      : h,
  );

  let html = readFileSync(TEMPLATE, "utf-8");
  html = html.replace(
    /<style>\/\* cyrillic-ext \*\/[\s\S]*?<\/style>\s*<style>/,
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />\n<style>',
  );

  const heroB64 = readFileSync(HERO).toString("base64");
  html = html.replace('src="ef0bc860-4c0d-4236-9ab2-b0a694da3972"', `src="data:image/png;base64,${heroB64}"`);
  html = html.replace('href="Главная (редизайн) v3.html"', 'href="#"');
  html = html.replace('href="Задачи и идеи.html"', 'href="#"');

  html = html.replace(/const CATS=\{[\s\S]*?\};/, `const CATS=${jsCats(cats)};`);
  html = html.replace(/const SEED=\[[\s\S]*?\];/, `const SEED=${jsSeed(allRows)};`);
  html = html.replace(
    'const KEY="tt-tx-v1";',
    `const KEY="tt-tx-v1";\nconst HIST=${JSON.stringify(hist)};`,
  );
  html = html.replace(
    "function renderBars(){const ms=months(),show=ms.slice(-6),data=show.map(m=>({m,...totals(m)}));",
    "function renderBars(){const ms=months(),show=(HIST&&HIST.length?HIST.map(h=>h.m):ms.slice(-6)),data=show.map(m=>{const h=HIST&&HIST.find(x=>x.m===m);return h?{m,inc:h.inc,out:h.out,prof:h.inc-h.out}:{m,...totals(m)};});",
  );
  html = html.replace('$("#a-date").value="2026-08-28";', '$("#a-date").value="2026-08-29";');

  writeFileSync(OUT, html, "utf-8");
  const augInc = hist.find((h) => h.m === "2026-08")?.inc ?? 0;
  console.log(`Wrote ${OUT}`);
  console.log(`  rows: ${allRows.length} (${exportData.rows.length} expenses + ${incomeRows.length} income/hist)`);
  console.log(`  aug 2026: +${augInc.toLocaleString("ru-RU")} / −${hist.find((h) => h.m === "2026-08")?.out.toLocaleString("ru-RU")} ₽`);
}

main();
