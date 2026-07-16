"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { fetchJson } from "@/lib/v2/client/fetch-json";
import { adjacentFinanceMonth, FINANCE_MONTH_NAMES, formatRub } from "@/lib/v2/finance/meta";
import type { LeadAnalyticsMonthPoint, LeadAnalyticsPayload } from "@/lib/v2/leads/lead-analytics";
import { V2_LEAD_TYPES } from "@/lib/v2/leads/lead-types";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatRubShort(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace(".", ",")} млн`;
  if (abs >= 10_000) return `${Math.round(n / 1000).toLocaleString("ru-RU")} тыс`;
  return formatRub(n);
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--v2-ink-100)] bg-white px-4 py-3.5 shadow-[var(--v2-shadow-card)]">
      {accent ? (
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} aria-hidden />
      ) : null}
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">{label}</div>
      <div className="v2-tnum mt-1.5 text-[19px] font-semibold tracking-tight text-[var(--v2-ink-900)]">{value}</div>
      {hint ? <div className="v2-tight mt-1 text-[12px] text-[var(--v2-ink-500)]">{hint}</div> : null}
    </div>
  );
}

function MoneyTrendChart({
  series,
  selectedIdx,
  onSelect,
}: {
  series: LeadAnalyticsMonthPoint[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  const W = 720;
  const H = 260;
  const padX = 28;
  const padTop = 28;
  const padBot = 36;
  const [hover, setHover] = useState(selectedIdx);

  useEffect(() => setHover(selectedIdx), [selectedIdx]);

  const leadsAmt = series.map((d) => d.estimatedAmount);
  const closed = series.map((d) => d.takenIntoWorkAmount);
  const actual = series.map((d) => d.finance.actualRevenue);
  const profit = series.map((d) => d.finance.profit);
  const rawMax = Math.max(...leadsAmt, ...closed, ...actual, ...profit, 1);
  const rawMin = Math.min(0, ...profit);
  const span = rawMax - rawMin || 1;
  const min = rawMin - span * 0.04;
  const max = rawMax + span * 0.08;

  const X = (i: number) =>
    series.length <= 1 ? W / 2 : padX + (i * (W - padX * 2)) / (series.length - 1);
  const Y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBot);

  const leadPts = series.map((d, i) => ({ x: X(i), y: Y(d.estimatedAmount) }));
  const closedPts = series.map((d, i) => ({ x: X(i), y: Y(d.takenIntoWorkAmount) }));
  const actualPts = series.map((d, i) => ({ x: X(i), y: Y(d.finance.actualRevenue) }));
  const profitPts = series.map((d, i) => ({ x: X(i), y: Y(d.finance.profit) }));
  const leadLine = smoothPath(leadPts);
  const closedLine = smoothPath(closedPts);
  const actualLine = smoothPath(actualPts);
  const profitLine = smoothPath(profitPts);
  const closedArea =
    closedPts.length > 1
      ? `${closedLine} L ${closedPts[closedPts.length - 1]!.x} ${H - padBot} L ${closedPts[0]!.x} ${H - padBot} Z`
      : "";

  const hi = hover;
  const hd = series[hi];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[12px] text-[var(--v2-ink-600)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Сумма лидов
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[var(--v2-brand-500)]" /> Закрыто продаж
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-500" /> Факт. выручка
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Прибыль
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ display: "block" }}
        onMouseLeave={() => setHover(selectedIdx)}
      >
        <defs>
          <linearGradient id="laClosedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B6FF7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3B6FF7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => {
          const y = padTop + t * (H - padTop - padBot);
          return (
            <line key={i} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#0A0A0B" strokeOpacity="0.06" />
          );
        })}
        {rawMin < 0 ? (
          <line
            x1={padX}
            x2={W - padX}
            y1={Y(0)}
            y2={Y(0)}
            stroke="#0A0A0B"
            strokeOpacity="0.12"
            strokeDasharray="4 4"
          />
        ) : null}
        {closedArea ? <path d={closedArea} fill="url(#laClosedFill)" /> : null}
        <path d={closedLine} fill="none" stroke="#3B6FF7" strokeWidth="2.6" strokeLinecap="round" />
        <path d={actualLine} fill="none" stroke="#0EA5A4" strokeWidth="2.2" strokeLinecap="round" />
        <path d={profitLine} fill="none" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
        <path
          d={leadLine}
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="6 4"
        />
        {series.map((d, i) => {
          const x = X(i);
          const active = i === hi;
          const selected = i === selectedIdx;
          return (
            <g key={`${d.year}-${d.month}`}>
              <rect
                x={series.length <= 1 ? 0 : x - (W - padX * 2) / (series.length - 1) / 2}
                y={0}
                width={series.length <= 1 ? W : (W - padX * 2) / (series.length - 1)}
                height={H}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover(i)}
                onClick={() => onSelect(i)}
              />
              {selected ? (
                <line
                  x1={x}
                  x2={x}
                  y1={padTop}
                  y2={H - padBot}
                  stroke="#3B6FF7"
                  strokeOpacity="0.2"
                  strokeWidth="2"
                />
              ) : null}
              <circle cx={x} cy={Y(d.takenIntoWorkAmount)} r={active ? 4.5 : 0} fill="#fff" stroke="#3B6FF7" strokeWidth="2.2" />
              <circle cx={x} cy={Y(d.estimatedAmount)} r={active ? 4 : 0} fill="#fff" stroke="#F59E0B" strokeWidth="2" />
              <circle cx={x} cy={Y(d.finance.actualRevenue)} r={active ? 4 : 0} fill="#fff" stroke="#0EA5A4" strokeWidth="2" />
              <circle cx={x} cy={Y(d.finance.profit)} r={active ? 4 : 0} fill="#fff" stroke="#10B981" strokeWidth="2" />
              <text
                x={x}
                y={H - 12}
                textAnchor="middle"
                fontSize="11"
                fill={selected ? "#0A0A0B" : "#A1A1AA"}
                fontWeight={selected ? 700 : 500}
              >
                {d.shortLabel}
              </text>
            </g>
          );
        })}
        {hd ? (
          <g transform={`translate(${Math.min(Math.max(X(hi), 90), W - 90)}, ${padTop + 4})`}>
            <rect x={-86} y={0} width={172} height={62} rx={10} fill="#0A0A0B" />
            <text x={0} y={16} textAnchor="middle" fontSize="10.5" fill="#A1A1AA">
              {hd.label}
            </text>
            <text x={0} y={34} textAnchor="middle" fontSize="12" fill="#FBBF24" fontWeight="600">
              лиды {formatRubShort(hd.estimatedAmount)}
            </text>
            <text x={0} y={50} textAnchor="middle" fontSize="12" fill="#93C5FD" fontWeight="600">
              закрыто {formatRubShort(hd.takenIntoWorkAmount)}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function LeadFlowBars({
  series,
  selectedIdx,
  onSelect,
}: {
  series: LeadAnalyticsMonthPoint[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  const W = 720;
  const H = 220;
  const padX = 24;
  const padTop = 20;
  const padBot = 36;
  const [hover, setHover] = useState(selectedIdx);
  useEffect(() => setHover(selectedIdx), [selectedIdx]);

  const max = Math.max(1, ...series.map((d) => Math.max(d.leadsCount, d.takenIntoWorkCount)));
  const slot = series.length ? (W - padX * 2) / series.length : W;
  const bw = Math.min(slot * 0.32, 16);
  const Y = (v: number) => padTop + (1 - v / max) * (H - padTop - padBot);
  const base = H - padBot;
  const hd = series[hover];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[12px] text-[var(--v2-ink-600)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--v2-brand-500)]" /> Пришло
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Взяли в работу
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
        {[0, 0.5, 1].map((t, i) => {
          const y = padTop + t * (H - padTop - padBot);
          return (
            <line key={i} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#0A0A0B" strokeOpacity="0.06" />
          );
        })}
        {series.map((d, i) => {
          const cx = padX + slot * i + slot / 2;
          const on = i === hover;
          const selected = i === selectedIdx;
          return (
            <g
              key={`${d.year}-${d.month}`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onClick={() => onSelect(i)}
            >
              <rect x={padX + slot * i} y={0} width={slot} height={H} fill="transparent" />
              <rect
                x={cx - bw - 2}
                y={Y(d.leadsCount)}
                width={bw}
                height={Math.max(0, base - Y(d.leadsCount))}
                rx={4}
                fill="#3B6FF7"
                opacity={on || selected ? 1 : 0.75}
              />
              <rect
                x={cx + 2}
                y={Y(d.takenIntoWorkCount)}
                width={bw}
                height={Math.max(0, base - Y(d.takenIntoWorkCount))}
                rx={4}
                fill="#10B981"
                opacity={on || selected ? 1 : 0.75}
              />
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                fontSize="11"
                fill={selected ? "#0A0A0B" : "#A1A1AA"}
                fontWeight={selected ? 700 : 500}
              >
                {d.shortLabel}
              </text>
            </g>
          );
        })}
        {hd ? (
          <g transform={`translate(${Math.min(Math.max(padX + slot * hover + slot / 2, 70), W - 70)}, ${padTop})`}>
            <rect x={-64} y={0} width={128} height={44} rx={10} fill="#0A0A0B" />
            <text x={0} y={18} textAnchor="middle" fontSize="11" fill="#93C5FD">
              {hd.leadsCount} лид.
            </text>
            <text x={0} y={34} textAnchor="middle" fontSize="11" fill="#6EE7B7">
              {hd.takenIntoWorkCount} в работу · {hd.conversionRate}%
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function TypeDonut({ point }: { point: LeadAnalyticsMonthPoint }) {
  const agency = point.byType.agency.count;
  const course = point.byType.course.count;
  const total = agency + course;
  const size = 160;
  const r = 54;
  const c = 2 * Math.PI * r;
  const agencyLen = total ? (agency / total) * c : 0;
  const courseLen = total ? (course / total) * c : 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F4F4F5" strokeWidth="18" />
        {total > 0 ? (
          <>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#1F3AAF"
              strokeWidth="18"
              strokeDasharray={`${agencyLen} ${c - agencyLen}`}
              strokeDashoffset={c / 4}
              strokeLinecap="butt"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#047857"
              strokeWidth="18"
              strokeDasharray={`${courseLen} ${c - courseLen}`}
              strokeDashoffset={c / 4 - agencyLen}
              strokeLinecap="butt"
            />
          </>
        ) : null}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="#0A0A0B">
          {total}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="11" fill="#71717A">
          лидов
        </text>
      </svg>
      <div className="space-y-3">
        {V2_LEAD_TYPES.map((t) => {
          const slice = point.byType[t.key];
          return (
            <div key={t.key}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.ink }} />
                <span className="text-[13px] font-medium text-[var(--v2-ink-800)]">{t.label}</span>
              </div>
              <div className="v2-tnum mt-0.5 pl-[18px] text-[13px] text-[var(--v2-ink-500)]">
                {slice.count} · {formatRub(slice.estimatedAmount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourceBars({ point }: { point: LeadAnalyticsMonthPoint }) {
  const rows = point.bySource.length
    ? point.bySource
    : [{ key: "empty", label: "Нет данных", count: 0, estimatedAmount: 0, takenIntoWorkCount: 0 }];
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="space-y-3">
      {rows.map((s) => (
        <div key={s.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="v2-tight text-[13px] font-medium text-[var(--v2-ink-800)]">{s.label}</span>
            <span className="v2-tnum text-[12px] text-[var(--v2-ink-500)]">
              {s.count} · {formatRub(s.estimatedAmount)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
            <div
              className="h-full rounded-full bg-[var(--v2-brand-500)] transition-all"
              style={{ width: `${Math.round((s.count / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LeadsAnalyticsPanel() {
  const today = new Date();
  const [data, setData] = useState<LeadAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchJson<LeadAnalyticsPayload>("/api/v2/admin/leads/analytics");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIdx = useMemo(() => {
    if (!data?.series.length) return -1;
    const i = data.series.findIndex((p) => p.year === year && p.month === month);
    return i >= 0 ? i : data.series.length - 1;
  }, [data, year, month]);

  const point = selectedIdx >= 0 ? data?.series[selectedIdx] : null;

  function selectIdx(i: number) {
    const p = data?.series[i];
    if (!p) return;
    setYear(p.year);
    setMonth(p.month);
  }

  function shiftMonth(delta: -1 | 1) {
    const next = adjacentFinanceMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  if (loading) {
    return <div className="py-24 text-center text-[13.5px] text-[var(--v2-ink-500)]">Загрузка аналитики…</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-800">{error}</div>
    );
  }

  if (!data || !point) return null;

  const fin = point.finance;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="v2-tight text-[18px] font-semibold text-[var(--v2-ink-900)]">Аналитика за месяц</h2>
          <p className="v2-tight mt-1 text-[13px] text-[var(--v2-ink-500)]">
            Лиды — по дате добавления. «Закрыто продаж» — сумма лидов с галкой «взяли в работу». Выручка и
            прибыль — из финансов за тот же месяц.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--v2-ink-200)] bg-white p-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
            aria-label="Предыдущий месяц"
          >
            ‹
          </button>
          <div className="v2-tight min-w-[140px] text-center text-[13.5px] font-semibold text-[var(--v2-ink-900)]">
            {FINANCE_MONTH_NAMES[month - 1]} {year}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)]"
            aria-label="Следующий месяц"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Лидов" value={String(point.leadsCount)} hint="добавлено за месяц" accent="#3B6FF7" />
        <Kpi label="Сумма лидов" value={formatRub(point.estimatedAmount)} hint="ориентир по всем лидам" accent="#F59E0B" />
        <Kpi
          label="Взяли в работу"
          value={`${point.takenIntoWorkCount}`}
          hint={`конверсия ${point.conversionRate}%`}
          accent="#10B981"
        />
        <Kpi
          label="Закрыто продаж"
          value={formatRub(point.takenIntoWorkAmount)}
          hint="сумма лидов, взятых в работу"
          accent="#3B6FF7"
        />
        <Kpi
          label="Фактическая выручка"
          value={formatRub(fin.actualRevenue)}
          hint={
            point.takenIntoWorkAmount
              ? `${Math.round((fin.actualRevenue / point.takenIntoWorkAmount) * 100)}% от закрытых`
              : "оплачено в финансах"
          }
          accent="#0EA5A4"
        />
        <Kpi
          label="Прибыль"
          value={formatRub(fin.profit)}
          hint="из проектов и финансов"
          accent={fin.profit >= 0 ? "#10B981" : "#EF4444"}
        />
      </div>

      <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <div className="mb-1 flex items-center gap-2">
          <V2Icons.ruble className="h-4 w-4 text-[var(--v2-ink-500)]" />
          <h3 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">Лиды vs финансы</h3>
        </div>
        <p className="mb-4 text-[12.5px] text-[var(--v2-ink-500)]">
          Клик по месяцу на графике переключает KPI выше
        </p>
        <MoneyTrendChart series={data.series} selectedIdx={selectedIdx} onSelect={selectIdx} />
      </div>

      <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
        <h3 className="v2-tight mb-1 text-[15px] font-semibold text-[var(--v2-ink-900)]">Поток лидов</h3>
        <p className="mb-4 text-[12.5px] text-[var(--v2-ink-500)]">Сколько пришло и сколько реально взяли в работу</p>
        <LeadFlowBars series={data.series} selectedIdx={selectedIdx} onSelect={selectIdx} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
          <h3 className="v2-tight mb-4 text-[15px] font-semibold text-[var(--v2-ink-900)]">
            Агентство / курс · {point.label}
          </h3>
          <TypeDonut point={point} />
        </div>
        <div className="rounded-2xl border border-[var(--v2-ink-100)] bg-white p-5 shadow-[var(--v2-shadow-card)]">
          <h3 className="v2-tight mb-4 text-[15px] font-semibold text-[var(--v2-ink-900)]">
            Источники · {point.label}
          </h3>
          <SourceBars point={point} />
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)]/50 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--v2-ink-500)]">
          Воронка месяца
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13.5px] text-[var(--v2-ink-800)]">
          <span className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="v2-tnum font-semibold">{point.leadsCount}</span> лидов ·{" "}
            <span className="v2-tnum font-semibold">{formatRub(point.estimatedAmount)}</span>
          </span>
          <span className="text-[var(--v2-ink-400)]">→</span>
          <span className="rounded-xl bg-white px-3 py-2 shadow-sm">
            <span className="v2-tnum font-semibold">{point.takenIntoWorkCount}</span> в работу · закрыто{" "}
            <span className="v2-tnum font-semibold">{formatRub(point.takenIntoWorkAmount)}</span>
          </span>
          <span className="text-[var(--v2-ink-400)]">→</span>
          <span className="rounded-xl bg-white px-3 py-2 shadow-sm">
            оплачено <span className="v2-tnum font-semibold">{formatRub(fin.actualRevenue)}</span> · прибыль{" "}
            <span className="v2-tnum font-semibold">{formatRub(fin.profit)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
