"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useHomePersonalFinance } from "@/components/v2/home/personal/home-personal-finance-context";
import { allocateGoals, cushionPool } from "@/components/v2/personal/finance/personal-finance-system";
import { homeFmt } from "@/lib/v2/personal/seeds/home-seed";
import type { PersonalIncomeHistoryRow } from "@/lib/v2/personal/types";

type SeriesKey = "profit" | "capital";
type ChartView = "fit" | "scroll";

const MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const POINT_GAP = 84;
const CHART_H = 300;
const Y_AXIS_W = 74;
const PR = 28;
const PT = 22;
const PB = 36;

function fmtRub(n: number) {
  return `${homeFmt(n)} ₽`;
}

function buildFullSeries(
  rows: PersonalIncomeHistoryRow[],
  key: SeriesKey
): { labels: string[]; values: number[]; keys: string[] } {
  const sorted = [...rows].sort((a, b) => a.year - b.year || a.month - b.month);
  const labels = sorted.map(
    (r) => `${MONTH_SHORT[r.month - 1] ?? String(r.month)} '${String(r.year).slice(-2)}`
  );
  const values = sorted.map((r) => (key === "profit" ? r.profit_rub ?? 0 : r.accounts_total_rub ?? 0));
  const keys = sorted.map((r) => `${r.year}-${r.month}`);
  return { labels, values, keys };
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

function avgProfitLast6(rows: PersonalIncomeHistoryRow[]): number | null {
  const last6 = sortedHistory(rows).slice(-6);
  const profits = last6.map((r) => r.profit_rub).filter((v): v is number => v != null);
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

function profitDeltaLast6(rows: PersonalIncomeHistoryRow[]): string {
  const sorted = sortedHistory(rows);
  const cur = avgProfitFromSlice(sorted.slice(-6));
  const prev = avgProfitFromSlice(sorted.slice(-12, -6));
  if (cur == null || prev == null) return "—";
  return pctChange(cur, prev);
}

function avgProfitFromSlice(slice: PersonalIncomeHistoryRow[]): number | null {
  const profits = slice.map((r) => r.profit_rub).filter((v): v is number => v != null);
  if (!profits.length) return null;
  return profits.reduce((s, v) => s + v, 0) / profits.length;
}

function formatAxisTick(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1000) return `${Math.round(v / 1000).toLocaleString("ru-RU")}к`;
  return String(Math.round(v));
}

export function HomeDynamicsChart() {
  const { dashboard } = useHomePersonalFinance();
  const [seriesKey, setSeriesKey] = useState<SeriesKey>("profit");
  const [chartView, setChartView] = useState<ChartView>("fit");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [plotViewportW, setPlotViewportW] = useState(900);

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
      return { labels: [] as string[], values: [] as number[], keys: [] as string[] };
    }
    return buildFullSeries(dashboard.incomeHistory, seriesKey);
  }, [dashboard, seriesKey]);

  const plotW = useMemo(() => {
    const n = series.values.length;
    if (n < 2) return plotViewportW;
    if (chartView === "fit") return plotViewportW;
    return Math.max(plotViewportW, (n - 1) * POINT_GAP + PR);
  }, [series.values.length, plotViewportW, chartView]);

  const chart = useMemo(() => {
    const { values, labels } = series;
    if (values.length < 2) return null;

    const innerW = Math.max(1, plotW - PR);
    const max = Math.ceil((Math.max(...values) * 1.12) / 50000) * 50000 || 1;
    const xAt = (i: number) => (i * innerW) / (values.length - 1);
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
      label: formatAxisTick(t),
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
      xAt,
      yAt,
    };
  }, [series, plotW]);

  useEffect(() => {
    if (chartView !== "scroll") return;
    const el = scrollRef.current;
    if (!el || series.values.length < 2) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [series.values.length, seriesKey, chartView, plotW]);

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

  const stats = useMemo(() => {
    const vals = series.values;
    const history = dashboard?.incomeHistory ?? [];
    if (!vals.length || !dashboard) return [];

    if (seriesKey === "profit") {
      const avg6 = avgProfitLast6(history) ?? dashboard.summary.avgProfit6m;
      const margin6 = avgMarginLast6(history);
      const best = Math.max(...vals);
      const bestIdx = vals.indexOf(best);
      return [
        ["Средняя прибыль · 6 мес.", avg6 != null ? fmtRub(avg6) : "—", profitDeltaLast6(history)],
        ["Маржа · 6 мес.", margin6 != null ? `${margin6}%` : "—", marginDeltaLast6(history)],
        ["Лучший месяц", fmtRub(best), series.labels[bestIdx] ?? ""],
      ];
    }

    const last = vals[vals.length - 1] ?? 0;
    const prev = vals[vals.length - 2] ?? last;
    const pool = cushionPool(dashboard.funds?.length ? dashboard.funds : dashboard.accounts);
    const allocated = allocateGoals(dashboard.goals, pool);
    const cushionGoal =
      allocated.find((g) => g.goal_key === "cushion_goal") ??
      allocated.find((g) => g.target_rub === 1_000_000);
    const cushionTarget = cushionGoal?.target_rub ?? 1_000_000;
    const leftToCushion = cushionGoal?.left ?? Math.max(0, cushionTarget - pool);
    const filledPct = cushionTarget > 0 ? Math.round(((cushionTarget - leftToCushion) / cushionTarget) * 100) : 0;

    return [
      ["Капитал сейчас", fmtRub(last), pctChange(last, prev)],
      ["Прирост за месяц", fmtRub(last - prev), pctChange(last - prev, prev)],
      [
        "До цели подушки",
        fmtRub(leftToCushion),
        `${filledPct}% · цель ${homeFmt(cushionTarget)} ₽`,
      ],
    ];
  }, [series, seriesKey, dashboard]);

  if (!dashboard || !chart || !series.values.length) return null;

  const kick = seriesKey === "profit" ? "Прибыль по месяцам" : "Капитал по месяцам";
  const rangeLabel =
    series.labels.length > 1
      ? `${series.labels[0]} — ${series.labels[series.labels.length - 1]}`
      : series.labels[0] ?? "";
  const scrollable = chartView === "scroll" && plotW > plotViewportW + 1;
  const activePt = chart.pts[activeIdx];

  return (
    <section className="v2-card px-7 py-6">
      <div className="flex flex-wrap items-end gap-7">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
            {kick}
          </span>
          <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-400)]">
            {rangeLabel}
            {scrollable ? " · прокрутите влево к началу" : " · все месяцы на одном экране"}
          </p>
          <div className="v2-tnum mt-2.5 text-[44px] font-semibold leading-none tracking-[-0.04em] text-[var(--v2-ink-900)]">
            {fmtRub(curVal)}
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
            {(["fit", "scroll"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setChartView(mode)}
                className={`rounded-[11px] px-4 py-2 text-[13.5px] font-semibold transition ${
                  chartView === mode
                    ? "bg-white text-[var(--v2-ink-900)] shadow-sm"
                    : "text-[var(--v2-ink-500)]"
                }`}
              >
                {mode === "fit" ? "Обзор" : "Детально"}
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
              ₽
            </text>
          </svg>
        </div>

        <div
          ref={scrollRef}
          className={`min-w-0 flex-1 ${scrollable ? "overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]" : "overflow-hidden"}`}
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

              {series.labels.map((label, i) => (
                <text
                  key={series.keys[i] ?? label}
                  x={chart.pts[i]![0]}
                  y={CHART_H - 10}
                  textAnchor="middle"
                  fontSize="12.5"
                  fill="#a1a1aa"
                  fontFamily="inherit"
                >
                  {label}
                </text>
              ))}

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
                {fmtRub(series.values[activeIdx] ?? 0)}
                <small className="mt-0.5 block text-[12px] font-medium opacity-60">
                  {series.labels[activeIdx]}
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
