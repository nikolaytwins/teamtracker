"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useHomePersonalFinance } from "@/components/v2/home/personal/home-personal-finance-context";
import { allocateGoals, cushionPool } from "@/components/v2/personal/finance/personal-finance-system";
import { homeFmt } from "@/lib/v2/personal/seeds/home-seed";
import type { PersonalIncomeHistoryRow } from "@/lib/v2/personal/types";

type SeriesKey = "profit" | "capital";
type ChartView = "all" | "fit" | "scroll";
type CurrencyMode = "rub" | "usd";

const MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const OVERVIEW_GAP = 56;
const DETAIL_GAP = 84;
const MIN_ALL_GAP = 6;
const CHART_H = 300;
const Y_AXIS_W = 82;
const PR = 28;
const PT = 22;
const PB = 40;

function labelStep(gap: number, total: number): number {
  if (gap >= 48) return 1;
  if (gap >= 32) return 2;
  if (gap >= 22) return 3;
  if (gap >= 16) return 4;
  if (gap >= 12) return 6;
  return Math.max(1, Math.ceil(total / 10));
}

function shouldShowMonthLabel(i: number, total: number, gap: number): boolean {
  if (i === 0 || i === total - 1) return true;
  const step = labelStep(gap, total);
  return i % step === 0;
}

function resolveChartLayout(
  mode: ChartView,
  pointCount: number,
  viewportW: number
): { pointGap: number; plotW: number; innerW: number; scrollable: boolean } {
  if (pointCount < 2) {
    return { pointGap: OVERVIEW_GAP, plotW: viewportW, innerW: Math.max(1, viewportW - PR), scrollable: false };
  }

  if (mode === "all") {
    const innerW = Math.max(MIN_ALL_GAP, viewportW - PR);
    const pointGap = innerW / (pointCount - 1);
    return { pointGap, plotW: viewportW, innerW, scrollable: false };
  }

  const pointGap = mode === "fit" ? OVERVIEW_GAP : DETAIL_GAP;
  const inner = (pointCount - 1) * pointGap;
  const plotW = Math.max(viewportW, inner + PR);
  return { pointGap, plotW, innerW: inner, scrollable: plotW > viewportW + 1 };
}

function monthRateKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function rubValueForRow(row: PersonalIncomeHistoryRow, key: SeriesKey): number {
  return key === "profit" ? row.profit_rub ?? 0 : row.accounts_total_rub ?? 0;
}

function convertRubToDisplay(
  rub: number,
  year: number,
  month: number,
  currency: CurrencyMode,
  usdRates: Record<string, number>
): number {
  if (currency === "rub") return rub;
  const rate = usdRates[monthRateKey(year, month)];
  if (!rate || rate <= 0) return 0;
  return rub / rate;
}

function fmtMoney(n: number, currency: CurrencyMode): string {
  if (currency === "usd") {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (abs >= 1000) return `$${Math.round(n).toLocaleString("en-US")}`;
    return `$${Math.round(n).toLocaleString("en-US")}`;
  }
  return `${homeFmt(n)} ₽`;
}

function formatAxisTick(v: number, currency: CurrencyMode): string {
  if (currency === "usd") {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
    if (v >= 1000) return `$${Math.round(v / 1000).toLocaleString("en-US")}k`;
    return `$${Math.round(v)}`;
  }
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1000) return `${Math.round(v / 1000).toLocaleString("ru-RU")}к`;
  return String(Math.round(v));
}

function buildFullSeries(
  rows: PersonalIncomeHistoryRow[],
  key: SeriesKey,
  currency: CurrencyMode,
  usdRates: Record<string, number>
): { labels: string[]; values: number[]; keys: string[]; rates: (number | null)[] } {
  const sorted = [...rows].sort((a, b) => a.year - b.year || a.month - b.month);
  const labels = sorted.map(
    (r) => `${MONTH_SHORT[r.month - 1] ?? String(r.month)} '${String(r.year).slice(-2)}`
  );
  const values = sorted.map((r) =>
    convertRubToDisplay(rubValueForRow(r, key), r.year, r.month, currency, usdRates)
  );
  const keys = sorted.map((r) => monthRateKey(r.year, r.month));
  const rates = sorted.map((r) => usdRates[monthRateKey(r.year, r.month)] ?? null);
  return { labels, values, keys, rates };
}

function pctChange(cur: number, prev: number): string {
  if (!prev) return "—";
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  return `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1).replace(".", ",")}%`;
}

function pctChangePositive(cur: number, prev: number): boolean | null {
  if (!prev) return null;
  return cur - prev >= 0;
}

function sortedHistory(rows: PersonalIncomeHistoryRow[]): PersonalIncomeHistoryRow[] {
  return [...rows].sort((a, b) => a.year - b.year || a.month - b.month);
}

function avgProfitLast6(
  rows: PersonalIncomeHistoryRow[],
  currency: CurrencyMode,
  usdRates: Record<string, number>
): number | null {
  const last6 = sortedHistory(rows).slice(-6);
  const profits = last6
    .map((r) => convertRubToDisplay(r.profit_rub ?? 0, r.year, r.month, currency, usdRates))
    .filter((v) => v > 0 || currency === "rub");
  if (!profits.length) return null;
  return Math.round(profits.reduce((s, v) => s + v, 0) / profits.length);
}

function avgMarginLast6(rows: PersonalIncomeHistoryRow[]): number | null {
  const last6 = sortedHistory(rows).slice(-6);
  const margins: number[] = [];
  for (const r of last6) {
    if (r.earned_rub != null && r.earned_rub > 0 && r.profit_rub != null) {
      margins.push((r.profit_rub / r.earned_rub) * 100);
    }
  }
  if (!margins.length) return null;
  return Math.round(margins.reduce((s, v) => s + v, 0) / margins.length);
}

function marginDeltaLast6(rows: PersonalIncomeHistoryRow[]): string {
  const sorted = sortedHistory(rows);
  const cur = avgMarginFromSlice(sorted.slice(-6));
  const prev = avgMarginFromSlice(sorted.slice(-12, -6));
  if (cur == null || prev == null) return "—";
  const d = cur - prev;
  return `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1).replace(".", ",")} п.п.`;
}

function avgMarginFromSlice(slice: PersonalIncomeHistoryRow[]): number | null {
  const margins: number[] = [];
  for (const r of slice) {
    if (r.earned_rub != null && r.earned_rub > 0 && r.profit_rub != null) {
      margins.push((r.profit_rub / r.earned_rub) * 100);
    }
  }
  if (!margins.length) return null;
  return margins.reduce((s, v) => s + v, 0) / margins.length;
}

function profitDeltaLast6(
  rows: PersonalIncomeHistoryRow[],
  currency: CurrencyMode,
  usdRates: Record<string, number>
): string {
  const sorted = sortedHistory(rows);
  const cur = avgProfitFromSlice(sorted.slice(-6), currency, usdRates);
  const prev = avgProfitFromSlice(sorted.slice(-12, -6), currency, usdRates);
  if (cur == null || prev == null) return "—";
  return pctChange(cur, prev);
}

function avgProfitFromSlice(
  slice: PersonalIncomeHistoryRow[],
  currency: CurrencyMode,
  usdRates: Record<string, number>
): number | null {
  const profits = slice
    .map((r) => convertRubToDisplay(r.profit_rub ?? 0, r.year, r.month, currency, usdRates))
    .filter((v) => v > 0 || currency === "rub");
  if (!profits.length) return null;
  return profits.reduce((s, v) => s + v, 0) / profits.length;
}

function axisMax(values: number[], currency: CurrencyMode): number {
  const peak = Math.max(...values, 1);
  if (currency === "usd") {
    if (peak >= 10_000) return Math.ceil((peak * 1.12) / 1000) * 1000;
    if (peak >= 1000) return Math.ceil((peak * 1.12) / 100) * 100;
    return Math.ceil(peak * 1.12 / 10) * 10 || 1;
  }
  return Math.ceil((peak * 1.12) / 50000) * 50000 || 1;
}

export function HomeDynamicsChart() {
  const { dashboard } = useHomePersonalFinance();
  const [seriesKey, setSeriesKey] = useState<SeriesKey>("profit");
  const [currency, setCurrency] = useState<CurrencyMode>("rub");
  const [chartView, setChartView] = useState<ChartView>("all");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [plotViewportW, setPlotViewportW] = useState(900);

  const usdRates = dashboard?.usdMonthlyRates ?? {};
  const hasUsdRates = Object.keys(usdRates).length > 0;

  useEffect(() => {
    if (currency === "usd" && !hasUsdRates) setCurrency("rub");
  }, [currency, hasUsdRates]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPlotViewportW(el.clientWidth || 900));
    ro.observe(el);
    setPlotViewportW(el.clientWidth || 900);
    return () => ro.disconnect();
  }, []);

  const series = useMemo(() => {
    if (!dashboard?.incomeHistory?.length) {
      return { labels: [] as string[], values: [] as number[], keys: [] as string[], rates: [] as (number | null)[] };
    }
    return buildFullSeries(dashboard.incomeHistory, seriesKey, currency, usdRates);
  }, [dashboard, seriesKey, currency, usdRates]);

  const layout = useMemo(
    () => resolveChartLayout(chartView, series.values.length, plotViewportW),
    [chartView, series.values.length, plotViewportW]
  );
  const { pointGap, plotW, innerW, scrollable } = layout;

  const chart = useMemo(() => {
    const { values, labels } = series;
    if (values.length < 2) return null;

    const max = axisMax(values, currency);
    const xAt = (i: number) =>
      chartView === "all" ? (i * innerW) / (values.length - 1) : i * pointGap;
    const yAt = (v: number) => PT + (1 - v / max) * (CHART_H - PT - PB);

    const pts = values.map((v, i) => [xAt(i), yAt(v)] as const);
    let path = `M${pts[0]![0]},${pts[0]![1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const cx = (a[0] + b[0]) / 2;
      path += ` C${cx},${a[1]} ${cx},${b[1]} ${b[0]},${b[1]}`;
    }

    const grid = [0, max / 4, max / 2, (max * 3) / 4, max].map((t) => ({
      y: yAt(t),
      label: formatAxisTick(t, currency),
    }));
    const y0 = yAt(0);
    const fillPath = `${path} L${pts[pts.length - 1]![0]},${y0} L${pts[0]![0]},${y0} Z`;

    return {
      H: CHART_H,
      W: plotW,
      innerW,
      path,
      fillPath,
      pts,
      grid,
      max,
      labels,
      pointGap,
    };
  }, [series, plotW, innerW, pointGap, chartView, currency]);

  useEffect(() => {
    if (chartView === "all") return;
    const el = scrollRef.current;
    if (!el || series.values.length < 2) return;
    if (el.scrollWidth <= el.clientWidth + 1) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [series.values.length, seriesKey, chartView, plotW, currency]);

  const pickIndexFromClientX = (clientX: number) => {
    if (!chart || !scrollRef.current) return 0;
    const container = scrollRef.current;
    const rect = container.getBoundingClientRect();
    const mx = container.scrollLeft + (clientX - rect.left);

    let best = 0;
    let bestDist = Infinity;
    chart.pts.forEach((p, i) => {
      const d = Math.abs(p[0] - mx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  };

  const activeIdx = hoverIdx ?? (series.values.length ? series.values.length - 1 : 0);
  const curVal = series.values[activeIdx] ?? 0;
  const prevVal = series.values[activeIdx - 1] ?? 0;
  const monthDeltaPositive = pctChangePositive(curVal, prevVal);
  const activeRate = series.rates[activeIdx];

  const stats = useMemo(() => {
    const vals = series.values;
    const history = dashboard?.incomeHistory ?? [];
    if (!vals.length || !dashboard) return [];

    const fmt = (n: number) => fmtMoney(n, currency);

    if (seriesKey === "profit") {
      const avg6 =
        avgProfitLast6(history, currency, usdRates) ??
        (currency === "rub" ? dashboard.summary.avgProfit6m : null);
      const margin6 = avgMarginLast6(history);
      const best = Math.max(...vals);
      const bestIdx = vals.indexOf(best);
      return [
        ["Средняя прибыль · 6 мес.", avg6 != null ? fmt(avg6) : "—", profitDeltaLast6(history, currency, usdRates)],
        ["Маржа · 6 мес.", margin6 != null ? `${margin6}%` : "—", marginDeltaLast6(history)],
        ["Лучший месяц", fmt(best), series.labels[bestIdx] ?? ""],
      ];
    }

    const last = vals[vals.length - 1] ?? 0;
    const prev = vals[vals.length - 2] ?? last;
    const pool = cushionPool(dashboard.funds?.length ? dashboard.funds : dashboard.accounts);
    const allocated = allocateGoals(dashboard.goals, pool);
    const cushionGoal =
      allocated.find((g) => g.goal_key === "cushion_goal") ??
      allocated.find((g) => g.target_rub === 1_000_000);
    const cushionTargetRub = cushionGoal?.target_rub ?? 1_000_000;
    const leftToCushionRub = cushionGoal?.left ?? Math.max(0, cushionTargetRub - pool);
    const latestRow = history[0];
    const latestRate = latestRow ? usdRates[monthRateKey(latestRow.year, latestRow.month)] : undefined;
    const leftToCushion =
      currency === "usd" && latestRate
        ? leftToCushionRub / latestRate
        : leftToCushionRub;
    const cushionTarget =
      currency === "usd" && latestRate ? cushionTargetRub / latestRate : cushionTargetRub;
    const filledPct = cushionTargetRub > 0 ? Math.round(((cushionTargetRub - leftToCushionRub) / cushionTargetRub) * 100) : 0;

    return [
      ["Капитал сейчас", fmt(last), pctChange(last, prev)],
      ["Прирост за месяц", fmt(last - prev), pctChange(last - prev, prev)],
      [
        "До цели подушки",
        fmt(leftToCushion),
        `${filledPct}% · цель ${fmt(cushionTarget)}`,
      ],
    ];
  }, [series, seriesKey, dashboard, currency, usdRates]);

  if (!dashboard || !chart || !series.values.length) return null;

  const kick = seriesKey === "profit" ? "Прибыль по месяцам" : "Капитал по месяцам";
  const rangeLabel =
    series.labels.length > 1
      ? `${series.labels[0]} — ${series.labels[series.labels.length - 1]}`
      : series.labels[0] ?? "";
  const activePt = chart.pts[activeIdx];
  const viewHint =
    chartView === "all"
      ? " · весь период на экране"
      : scrollable
        ? " · прокрутите влево к началу"
        : null;
  const rateHint =
    currency === "usd" && activeRate
      ? ` · курс ЦБ ср. ${activeRate.toFixed(2).replace(".", ",")} ₽/$`
      : currency === "usd"
        ? " · курс ЦБ недоступен для месяца"
        : null;

  return (
    <section className="v2-card px-7 py-6">
      <div className="flex flex-wrap items-end gap-7">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
            {kick}
          </span>
          <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-400)]">
            {rangeLabel}
            {viewHint}
            {rateHint}
          </p>
          <div className="v2-tnum mt-2.5 text-[44px] font-semibold leading-none tracking-[-0.04em] text-[var(--v2-ink-900)]">
            {fmtMoney(curVal, currency)}
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span
              className={`v2-tight inline-flex items-center gap-1 rounded-[9px] px-2.5 py-1 text-[15px] font-semibold ${
                monthDeltaPositive === false
                  ? "bg-rose-50 text-rose-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {pctChange(curVal, prevVal)}
            </span>
            <span className="v2-tight text-[13.5px] text-[var(--v2-ink-400)]">к предыдущему месяцу</span>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex rounded-[14px] bg-[var(--v2-ink-100)] p-[3px]">
            {(["rub", "usd"] as const).map((c) => (
              <button
                key={c}
                type="button"
                disabled={c === "usd" && !hasUsdRates}
                onClick={() => setCurrency(c)}
                className={`rounded-[11px] px-4 py-2 text-[13.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  currency === c
                    ? "bg-white text-[var(--v2-ink-900)] shadow-sm"
                    : "text-[var(--v2-ink-500)]"
                }`}
              >
                {c === "rub" ? "₽" : "$"}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-[14px] bg-[var(--v2-ink-100)] p-[3px]">
            {(
              [
                ["all", "Весь"],
                ["fit", "Обзор"],
                ["scroll", "Детально"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setChartView(mode)}
                className={`rounded-[11px] px-3.5 py-2 text-[13px] font-semibold transition ${
                  chartView === mode
                    ? "bg-white text-[var(--v2-ink-900)] shadow-sm"
                    : "text-[var(--v2-ink-500)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-[14px] bg-[var(--v2-ink-100)] p-[3px]">
            {(["profit", "capital"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setSeriesKey(k)}
                className={`rounded-[11px] px-5 py-2 text-[14.5px] font-semibold transition ${
                  seriesKey === k
                    ? "bg-white text-[var(--v2-ink-900)] shadow-sm"
                    : "text-[var(--v2-ink-500)]"
                }`}
              >
                {k === "profit" ? "Прибыль" : "Капитал"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-[22px] flex">
        <div className="shrink-0" style={{ width: Y_AXIS_W }}>
          <svg
            viewBox={`0 0 ${Y_AXIS_W} ${CHART_H}`}
            className="block"
            style={{ width: Y_AXIS_W, height: CHART_H }}
            aria-hidden
          >
            {chart.grid.map((g) => (
              <text
                key={g.label}
                x={Y_AXIS_W - 10}
                y={g.y + 5}
                textAnchor="end"
                fontSize="12"
                fill="#a1a1aa"
                fontFamily="inherit"
              >
                {g.label}
              </text>
            ))}
            <text
              x={Y_AXIS_W - 10}
              y={CHART_H - 8}
              textAnchor="end"
              fontSize="11"
              fill="#c4c4cc"
              fontFamily="inherit"
            >
              {currency === "usd" ? "$" : "₽"}
            </text>
          </svg>
        </div>

        <div
          ref={scrollRef}
          className={`min-w-0 flex-1 pb-1 ${scrollable ? "overflow-x-auto overscroll-x-contain [scrollbar-width:thin]" : "overflow-x-hidden"}`}
        >
          <div className="relative" style={{ width: chart.W }}>
            <svg
              viewBox={`0 0 ${chart.W} ${CHART_H}`}
              className="block"
              style={{ width: chart.W, height: CHART_H }}
              onMouseLeave={() => setHoverIdx(null)}
              onMouseMove={(e) => setHoverIdx(pickIndexFromClientX(e.clientX))}
            >
              <defs>
                <linearGradient id="home-chart-g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2d5eef" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#2d5eef" stopOpacity="0" />
                </linearGradient>
              </defs>

              {chart.grid.map((g) => (
                <line
                  key={g.label}
                  x1={0}
                  x2={chart.innerW}
                  y1={g.y}
                  y2={g.y}
                  stroke="#eff0f4"
                  strokeWidth="1"
                />
              ))}

              <path d={chart.fillPath} fill="url(#home-chart-g)" />
              <path d={chart.path} fill="none" stroke="#2d5eef" strokeWidth="3" strokeLinecap="round" />

              {series.labels.map((label, i) =>
                shouldShowMonthLabel(i, series.labels.length, pointGap) ? (
                  <text
                    key={series.keys[i] ?? label}
                    x={chart.pts[i]![0]}
                    y={CHART_H - 12}
                    textAnchor="middle"
                    fontSize={pointGap < 18 ? "10" : "11.5"}
                    fill="#a1a1aa"
                    fontFamily="inherit"
                  >
                    {pointGap < 14 ? label.replace(" ", "") : label}
                  </text>
                ) : null
              )}

              {activePt ? (
                <>
                  <line
                    x1={activePt[0]}
                    x2={activePt[0]}
                    y1={PT}
                    y2={CHART_H - PB}
                    stroke="#c9d4f6"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={activePt[0]}
                    cy={activePt[1]}
                    r="7"
                    fill="#2d5eef"
                    stroke="#fff"
                    strokeWidth="3"
                  />
                </>
              ) : null}
            </svg>

            {activePt ? (
              <div
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-xl bg-[var(--v2-ink-900)] px-3 py-2 text-[15px] font-semibold text-white shadow-lg"
                style={{ left: activePt[0], top: activePt[1] }}
              >
                {fmtMoney(series.values[activeIdx] ?? 0, currency)}
                <small className="mt-0.5 block text-[12px] font-medium opacity-60">
                  {series.labels[activeIdx]}
                  {currency === "usd" && activeRate
                    ? ` · ${activeRate.toFixed(2).replace(".", ",")} ₽/$`
                    : null}
                </small>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {stats.map(([label, value, chip]) => (
          <div key={label} className="rounded-2xl bg-[var(--v2-ink-50)] px-5 py-[18px]">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
              {label}
            </span>
            <b className="v2-tnum mt-2 flex items-center gap-2 text-[26px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
              {value}
              {chip && chip !== "—" ? (
                <span className="rounded-[7px] bg-emerald-50 px-[7px] py-[3px] text-[12.5px] font-semibold text-emerald-700">
                  {chip}
                </span>
              ) : null}
            </b>
          </div>
        ))}
      </div>
    </section>
  );
}
