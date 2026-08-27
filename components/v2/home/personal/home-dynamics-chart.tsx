"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { homeFmt } from "@/lib/v2/personal/seeds/home-seed";
import type { PersonalFinanceDashboard, PersonalIncomeHistoryRow } from "@/lib/v2/personal/types";
type SeriesKey = "profit" | "capital";

const MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function fmtRub(n: number) {
  return `${homeFmt(n)} ₽`;
}

function buildSeries(
  rows: PersonalIncomeHistoryRow[],
  year: number,
  key: SeriesKey
): { labels: string[]; values: number[] } {
  const sorted = [...rows]
    .filter((r) => r.year === year)
    .sort((a, b) => a.month - b.month);
  const labels = sorted.map((r) => MONTH_SHORT[r.month - 1] ?? String(r.month));
  const values = sorted.map((r) =>
    key === "profit" ? r.profit_rub ?? 0 : r.accounts_total_rub ?? 0
  );
  return { labels, values };
}

function pctChange(cur: number, prev: number): string {
  if (!prev) return "—";
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  return `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1).replace(".", ",")}%`;
}

export function HomeDynamicsChart() {
  const [dashboard, setDashboard] = useState<PersonalFinanceDashboard | null>(null);
  const [seriesKey, setSeriesKey] = useState<SeriesKey>("profit");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchJson<PersonalFinanceDashboard>("/api/v2/personal/finance/dashboard");
        setDashboard(data);
      } catch {
        setDashboard(null);
      }
    })();
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 1000));
    ro.observe(el);
    setWidth(el.clientWidth || 1000);
    return () => ro.disconnect();
  }, []);

  const year = dashboard?.year ?? new Date().getFullYear();
  const series = useMemo(() => {
    if (!dashboard?.incomeHistory?.length) return { labels: [] as string[], values: [] as number[] };
    return buildSeries(dashboard.incomeHistory, year, seriesKey);
  }, [dashboard, year, seriesKey]);

  const chart = useMemo(() => {
    const { values } = series;
    if (values.length < 2) return null;
    const H = 300;
    const PL = 74;
    const PR = 20;
    const PT = 22;
    const PB = 16;
    const W = width;
    const max = Math.ceil((Math.max(...values) * 1.12) / 50000) * 50000 || 1;
    const x = (i: number) => PL + (i * (W - PL - PR)) / (values.length - 1);
    const y = (v: number) => PT + (1 - v / max) * (H - PT - PB);
    const pts = values.map((v, i) => [x(i), y(v)] as const);
    let path = `M${pts[0]![0]},${pts[0]![1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const cx = (a[0] + b[0]) / 2;
      path += ` C${cx},${a[1]} ${cx},${b[1]} ${b[0]},${b[1]}`;
    }
    const grid = [0, max / 4, max / 2, (max * 3) / 4, max].map((t) => ({
      y: y(t),
      label: `${Math.round(t / 1000).toLocaleString("ru-RU")}к`,
    }));
    const y0 = y(0);
    const fillPath = `${path} L${pts[pts.length - 1]![0]},${y0} L${pts[0]![0]},${y0} Z`;
    return { H, W, PL, PR, PT, PB, path, fillPath, pts, grid, max };
  }, [series, width]);

  const activeIdx = hoverIdx ?? (series.values.length ? series.values.length - 1 : 0);
  const curVal = series.values[activeIdx] ?? 0;
  const prevVal = series.values[activeIdx - 1] ?? 0;

  const stats = useMemo(() => {
    const vals = series.values;
    if (!vals.length) return [];
    if (seriesKey === "profit") {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      const best = Math.max(...vals);
      const bestIdx = vals.indexOf(best);
      return [
        ["Средняя прибыль", fmtRub(Math.round(avg)), pctChange(avg, vals[vals.length - 2] ?? avg)],
        [
          "Маржа",
          dashboard ? `${Math.round(dashboard.summary.monthProfit && dashboard.summary.projectExpectedRevenue ? (dashboard.summary.monthProfit / dashboard.summary.projectExpectedRevenue) * 100 : 0)}%` : "—",
          "—",
        ],
        ["Лучший месяц", fmtRub(best), MONTH_SHORT[bestIdx] ?? ""],
      ];
    }
    const last = vals[vals.length - 1] ?? 0;
    const prev = vals[vals.length - 2] ?? last;
    return [
      ["Капитал сейчас", fmtRub(last), pctChange(last, prev)],
      ["Прирост за месяц", fmtRub(last - prev), pctChange(last - prev, prev)],
      ["Целей в подушке", String(dashboard?.goals.length ?? 0), "—"],
    ];
  }, [series, seriesKey, dashboard]);

  if (!dashboard || !chart || !series.values.length) return null;

  const kick =
    seriesKey === "profit" ? `Прибыль по месяцам · ${year}` : `Капитал по месяцам · ${year}`;

  return (
    <section className="v2-card px-7 py-6">
      <div className="flex flex-wrap items-end gap-7">
        <div>
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.13em] text-[var(--v2-ink-400)]">
            {kick}
          </span>
          <div className="v2-tnum mt-2.5 text-[44px] font-semibold leading-none tracking-[-0.04em] text-[var(--v2-ink-900)]">
            {fmtRub(curVal)}
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <span className="v2-tight inline-flex items-center gap-1 rounded-[9px] bg-emerald-50 px-2.5 py-1 text-[15px] font-semibold text-emerald-700">
              {pctChange(curVal, prevVal)}
            </span>
            <span className="v2-tight text-[13.5px] text-[var(--v2-ink-400)]">к предыдущему месяцу</span>
          </div>
        </div>
        <div className="ml-auto inline-flex rounded-[14px] bg-[var(--v2-ink-100)] p-[3px]">
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

      <div ref={wrapRef} className="relative mt-[22px]">
        <svg
          viewBox={`0 0 ${chart.W} ${chart.H}`}
          className="block w-full"
          style={{ height: chart.H }}
          onMouseLeave={() => setHoverIdx(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mx = ((e.clientX - rect.left) / rect.width) * chart.W;
            let best = 0;
            let bd = Infinity;
            chart.pts.forEach((p, i) => {
              const dx = Math.abs(p[0] - mx);
              if (dx < bd) {
                bd = dx;
                best = i;
              }
            });
            setHoverIdx(best);
          }}
        >
          <defs>
            <linearGradient id="home-chart-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2d5eef" stopOpacity="0.18" />
              <stop offset="1" stopColor="#2d5eef" stopOpacity="0" />
            </linearGradient>
          </defs>
          {chart.grid.map((g) => (
            <g key={g.label}>
              <line
                x1={chart.PL}
                x2={chart.W - chart.PR}
                y1={g.y}
                y2={g.y}
                stroke="#eff0f4"
                strokeWidth="1"
              />
              <text
                x={chart.PL - 14}
                y={g.y + 5}
                textAnchor="end"
                fontSize="13"
                fill="#a1a1aa"
                fontFamily="inherit"
              >
                {g.label}
              </text>
            </g>
          ))}
          <path d={chart.fillPath} fill="url(#home-chart-g)" />
          <path d={chart.path} fill="none" stroke="#2d5eef" strokeWidth="3" strokeLinecap="round" />
          {chart.pts[activeIdx] ? (
            <>
              <line
                x1={chart.pts[activeIdx]![0]}
                x2={chart.pts[activeIdx]![0]}
                y1={chart.PT}
                y2={chart.H - chart.PB}
                stroke="#c9d4f6"
                strokeDasharray="4 4"
              />
              <circle
                cx={chart.pts[activeIdx]![0]}
                cy={chart.pts[activeIdx]![1]}
                r="7"
                fill="#2d5eef"
                stroke="#fff"
                strokeWidth="3"
              />
            </>
          ) : null}
        </svg>
        {chart.pts[activeIdx] ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] rounded-xl bg-[var(--v2-ink-900)] px-3 py-2 text-[15px] font-semibold text-white shadow-lg"
            style={{
              left: `${(chart.pts[activeIdx]![0] / chart.W) * 100}%`,
              top: `${(chart.pts[activeIdx]![1] / chart.H) * 100}%`,
            }}
          >
            {fmtRub(series.values[activeIdx] ?? 0)}
            <small className="mt-0.5 block text-[12px] font-medium opacity-60">
              {series.labels[activeIdx]} {year}
            </small>
          </div>
        ) : null}
      </div>

      <div
        className="mt-2 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${series.labels.length}, minmax(0, 1fr))`,
          paddingLeft: chart.PL - (width - chart.PL - chart.PR) / (series.values.length - 1) / 2,
          paddingRight: chart.PR - (width - chart.PL - chart.PR) / (series.values.length - 1) / 2,
        }}
      >
        {series.labels.map((l) => (
          <span key={l} className="text-center text-[13.5px] text-[var(--v2-ink-400)]">
            {l}
          </span>
        ))}
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
