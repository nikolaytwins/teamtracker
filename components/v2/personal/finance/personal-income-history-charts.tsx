"use client";

import { appPath } from "@/lib/api-url";
import {
  formatPersonalRubShort,
  formatPersonalRubSigned,
  PERSONAL_MONTH_SHORT,
} from "@/lib/v2/personal/formatters";
import type { PersonalIncomeHistoryRow } from "@/lib/v2/personal/types";
import { V2Icons } from "@/components/v2/ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

export type IncomeHistoryChartPoint = PersonalIncomeHistoryRow & {
  delta: number | null;
  profit_delta: number | null;
};

export type IncomeHistoryChartMode = "capital" | "profit";

export type IncomeHistoryChartKind = "capital-total" | "capital-delta" | "profit-total";

export function incomeHistoryChartExpandHref(kind: IncomeHistoryChartKind, mode: IncomeHistoryChartMode) {
  return appPath(`/v2/personal/finance/history/charts?kind=${kind}&mode=${mode}`);
}

export const CHART_KIND_META: Record<
  IncomeHistoryChartKind,
  { title: string; mode: IncomeHistoryChartMode }
> = {
  "capital-total": { title: "Капитал на счетах", mode: "capital" },
  "capital-delta": { title: "Изменение помесячно", mode: "capital" },
  "profit-total": { title: "Прибыль", mode: "profit" },
};

type ChartLayout = {
  W: number;
  H: number;
  padX: number;
  padTop: number;
  padBot: number;
  expanded: boolean;
};

function getChartLayout(pointCount: number, expanded = false): ChartLayout {
  const count = Math.max(pointCount, 2);
  return {
    W: expanded ? Math.max(1400, count * 58) : 920,
    H: expanded ? 380 : 248,
    padX: 24,
    padTop: expanded ? 36 : 28,
    padBot: expanded ? 44 : 36,
    expanded,
  };
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

function monthLabel(p: { year: number; month: number }, compact = false) {
  const m = PERSONAL_MONTH_SHORT[p.month - 1];
  if (compact) return m;
  return `${m} ${String(p.year).slice(2)}`;
}

function ChartGrid({ layout, midY }: { layout: ChartLayout; midY?: number }) {
  const { W, H, padTop, padBot, padX } = layout;
  const lines =
    midY != null ? [padTop, midY, H - padBot] : [0, 0.5, 1].map((t) => padTop + t * (H - padTop - padBot));
  return (
    <>
      {lines.map((y, i) => (
        <line
          key={i}
          x1={padX}
          x2={W - padX}
          y1={y}
          y2={y}
          stroke="#0A0A0B"
          strokeOpacity={midY != null && i === 1 ? 0.08 : 0.05}
          strokeWidth={midY != null && i === 1 ? 1.5 : 1}
          strokeDasharray={midY != null && i === 1 ? "4 4" : undefined}
        />
      ))}
    </>
  );
}

function Tooltip({
  layout,
  x,
  y,
  title,
  value,
  sub,
}: {
  layout: ChartLayout;
  x: number;
  y: number;
  title: string;
  value: string;
  sub?: string;
}) {
  const tx = Math.min(Math.max(x, 72), layout.W - 72);
  const ty = Math.max(y, 36);
  return (
    <g transform={`translate(${tx}, ${ty})`}>
      <rect x={-68} y={-34} width={136} height={sub ? 48 : 38} rx={10} fill="#0A0A0B" />
      <text x={0} y={-18} textAnchor="middle" fontSize="10.5" fill="#A1A1AA">
        {title}
      </text>
      <text x={0} y={-2} textAnchor="middle" fontSize="13.5" fontWeight="600" fill="#fff" className="font-mono">
        {value}
      </text>
      {sub ? (
        <text x={0} y={12} textAnchor="middle" fontSize="10.5" fill="#71717A" className="font-mono">
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function shouldShowLabel(i: number, total: number, expanded: boolean) {
  if (expanded) return true;
  return i === 0 || i === total - 1 || i % Math.ceil(total / 8) === 0;
}

function ChartSvgShell({
  layout,
  children,
  onMouseLeave,
}: {
  layout: ChartLayout;
  children: React.ReactNode;
  onMouseLeave?: () => void;
}) {
  const { W, H, expanded } = layout;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={expanded ? W : undefined}
      height={expanded ? H : undefined}
      className={expanded ? "block max-w-none" : "block h-auto w-full max-w-full"}
      style={{ display: "block" }}
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={onMouseLeave}
    >
      {children}
    </svg>
  );
}

export function IncomeHistoryCapitalChart({
  points,
  expanded = false,
}: {
  points: IncomeHistoryChartPoint[];
  expanded?: boolean;
}) {
  const layout = getChartLayout(points.length, expanded);
  const { W, H, padX, padTop, padBot } = layout;
  const [hover, setHover] = useState(() => Math.max(0, points.length - 1));
  if (points.length < 2) return null;

  const vals = points.map((p) => p.accounts_total_rub);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const span = rawMax - rawMin || Math.max(rawMax, 1) * 0.1 || 1;
  const min = rawMin - span * 0.04;
  const max = rawMax + span * 0.04;

  const X = (i: number) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const Y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBot);
  const pts = points.map((p, i) => ({ x: X(i), y: Y(p.accounts_total_rub) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1]!.x} ${H - padBot} L ${pts[0]!.x} ${H - padBot} Z`;
  const hp = pts[hover];
  const hd = points[hover];
  const slotW = (W - padX * 2) / (points.length - 1);

  return (
    <ChartSvgShell layout={layout} onMouseLeave={() => setHover(points.length - 1)}>
      <defs>
        <linearGradient id="ihCapFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B6FF7" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#3B6FF7" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ChartGrid layout={layout} />
      <path d={area} fill="url(#ihCapFill)" />
      <path d={line} fill="none" stroke="#3B6FF7" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <rect
            x={p.x - slotW / 2}
            y={0}
            width={slotW}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            style={{ cursor: "pointer" }}
          />
          <circle cx={p.x} cy={p.y} r={i === hover ? 5 : 0} fill="#fff" stroke="#3B6FF7" strokeWidth="2.5" />
          {shouldShowLabel(i, points.length, expanded) ? (
            <text
              x={p.x}
              y={H - 12}
              textAnchor="middle"
              fontSize={expanded ? 11 : 10.5}
              fill="#A1A1AA"
              fontWeight={i === hover ? 700 : 500}
            >
              {layout.expanded ? monthLabel(points[i]!) : monthLabel(points[i]!, true)}
            </text>
          ) : null}
        </g>
      ))}
      {hp && hd ? (
        <g>
          <line
            x1={hp.x}
            x2={hp.x}
            y1={padTop}
            y2={H - padBot}
            stroke="#3B6FF7"
            strokeOpacity="0.22"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <Tooltip
            layout={layout}
            x={hp.x}
            y={hp.y - 16}
            title={monthLabel(hd)}
            value={formatPersonalRubShort(hd.accounts_total_rub)}
            sub={hd.delta != null ? `Δ ${formatPersonalRubSigned(hd.delta)}` : undefined}
          />
        </g>
      ) : null}
    </ChartSvgShell>
  );
}

export function IncomeHistoryCapitalDeltaChart({
  points,
  expanded = false,
}: {
  points: IncomeHistoryChartPoint[];
  expanded?: boolean;
}) {
  const deltas = points.filter((p) => p.delta != null);
  const layout = getChartLayout(deltas.length, expanded);
  const { W, H, padX, padTop, padBot } = layout;
  const [hover, setHover] = useState(() => Math.max(0, deltas.length - 1));
  if (deltas.length < 1) return null;

  const vals = deltas.map((p) => p.delta!);
  const absMax = Math.max(...vals.map(Math.abs), 1) * 1.12;
  const midY = padTop + (H - padTop - padBot) / 2;
  const halfH = (H - padTop - padBot) / 2;
  const slot = (W - padX * 2) / deltas.length;
  const bw = Math.min(slot * 0.55, expanded ? 28 : 22);
  const Y = (v: number) => midY - (v / absMax) * halfH;
  const hd = deltas[hover];

  return (
    <ChartSvgShell layout={layout}>
      <ChartGrid layout={layout} midY={midY} />
      {deltas.map((d, i) => {
        const v = d.delta!;
        const cx = padX + slot * i + slot / 2;
        const y0 = midY;
        const y1 = Y(v);
        const up = v >= 0;
        const on = i === hover;
        return (
          <g key={`${d.year}-${d.month}`} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <rect x={padX + slot * i} y={0} width={slot} height={H} fill="transparent" />
            <rect
              x={cx - bw / 2}
              y={up ? y1 : y0}
              width={bw}
              height={Math.max(Math.abs(y1 - y0), 2)}
              rx={5}
              fill={up ? "#10B981" : "#EF4444"}
              opacity={on ? 1 : 0.82}
            />
            {shouldShowLabel(i, deltas.length, expanded) ? (
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                fontSize={expanded ? 11 : 10.5}
                fill="#A1A1AA"
                fontWeight={on ? 700 : 500}
              >
                {layout.expanded ? monthLabel(d) : monthLabel(d, true)}
              </text>
            ) : null}
          </g>
        );
      })}
      {hd && hd.delta != null ? (
        <Tooltip
          layout={layout}
          x={padX + slot * hover + slot / 2}
          y={padTop + 8}
          title={monthLabel(hd)}
          value={formatPersonalRubSigned(hd.delta)}
          sub={formatPersonalRubShort(hd.accounts_total_rub)}
        />
      ) : null}
    </ChartSvgShell>
  );
}

export function IncomeHistoryProfitChart({
  points,
  expanded = false,
}: {
  points: IncomeHistoryChartPoint[];
  expanded?: boolean;
}) {
  const data = points.filter((p) => p.profit_rub != null);
  const layout = getChartLayout(data.length, expanded);
  const { W, H, padX, padTop, padBot } = layout;
  const [hover, setHover] = useState(() => Math.max(0, data.length - 1));
  if (data.length < 2) return null;

  const vals = data.map((p) => p.profit_rub!);
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const span = rawMax - rawMin || Math.max(rawMax, 1) * 0.1 || 1;
  const min = rawMin - span * 0.04;
  const max = rawMax + span * 0.04;

  const X = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const Y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBot);
  const pts = data.map((p, i) => ({ x: X(i), y: Y(p.profit_rub!) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1]!.x} ${H - padBot} L ${pts[0]!.x} ${H - padBot} Z`;
  const hp = pts[hover];
  const hd = data[hover];
  const slotW = (W - padX * 2) / (data.length - 1);

  return (
    <ChartSvgShell layout={layout} onMouseLeave={() => setHover(data.length - 1)}>
      <defs>
        <linearGradient id="ihProfitFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ChartGrid layout={layout} />
      <path d={area} fill="url(#ihProfitFill)" />
      <path d={line} fill="none" stroke="#10B981" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <rect
            x={p.x - slotW / 2}
            y={0}
            width={slotW}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            style={{ cursor: "pointer" }}
          />
          <circle cx={p.x} cy={p.y} r={i === hover ? 5 : 0} fill="#fff" stroke="#10B981" strokeWidth="2.5" />
          {shouldShowLabel(i, data.length, expanded) ? (
            <text
              x={p.x}
              y={H - 12}
              textAnchor="middle"
              fontSize={expanded ? 11 : 10.5}
              fill="#A1A1AA"
              fontWeight={i === hover ? 700 : 500}
            >
              {layout.expanded ? monthLabel(data[i]!) : monthLabel(data[i]!, true)}
            </text>
          ) : null}
        </g>
      ))}
      {hp && hd ? (
        <g>
          <line
            x1={hp.x}
            x2={hp.x}
            y1={padTop}
            y2={H - padBot}
            stroke="#10B981"
            strokeOpacity="0.22"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <Tooltip
            layout={layout}
            x={hp.x}
            y={hp.y - 16}
            title={monthLabel(hd)}
            value={formatPersonalRubShort(hd.profit_rub!)}
            sub={hd.profit_delta != null ? `Δ ${formatPersonalRubSigned(hd.profit_delta)}` : undefined}
          />
        </g>
      ) : null}
    </ChartSvgShell>
  );
}

export function IncomeHistoryChartByKind({
  kind,
  points,
  expanded = false,
}: {
  kind: IncomeHistoryChartKind;
  points: IncomeHistoryChartPoint[];
  expanded?: boolean;
}) {
  switch (kind) {
    case "capital-total":
      return <IncomeHistoryCapitalChart points={points} expanded={expanded} />;
    case "capital-delta":
      return <IncomeHistoryCapitalDeltaChart points={points} expanded={expanded} />;
    case "profit-total":
      return <IncomeHistoryProfitChart points={points} expanded={expanded} />;
  }
}

export function ChartScrollWrap({ layout, children }: { layout: ChartLayout; children: React.ReactNode }) {
  if (!layout.expanded) return <>{children}</>;
  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ minWidth: layout.W }}>{children}</div>
    </div>
  );
}

function ChartExpandLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-400)] transition hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
      title={label}
      aria-label={label}
    >
      <V2Icons.expand className="h-4 w-4" />
    </Link>
  );
}

function ChartCardHeader({
  title,
  legend,
  expandHref,
}: {
  title: string;
  legend?: React.ReactNode;
  expandHref: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <span className="text-[13px] font-semibold text-[var(--v2-ink-800)]">{title}</span>
      <div className="flex items-center gap-1">
        {legend}
        <ChartExpandLink href={expandHref} label={`Развернуть: ${title}`} />
      </div>
    </div>
  );
}

export function useIncomeHistoryChartPoints(rows: PersonalIncomeHistoryRow[]): IncomeHistoryChartPoint[] {
  return useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.year - b.year || a.month - b.month);
    return sorted.map((row, i) => {
      const prev = sorted[i - 1];
      const delta = prev ? row.accounts_total_rub - prev.accounts_total_rub : null;
      const profit_delta =
        prev && row.profit_rub != null && prev.profit_rub != null ? row.profit_rub - prev.profit_rub : null;
      return { ...row, delta, profit_delta };
    });
  }, [rows]);
}

export function IncomeHistoryChartsSection({
  points,
  mode,
  onModeChange,
}: {
  points: IncomeHistoryChartPoint[];
  mode: IncomeHistoryChartMode;
  onModeChange: (m: IncomeHistoryChartMode) => void;
}) {
  const latest = points[points.length - 1];
  const capitalDeltaPct = useMemo(() => {
    if (points.length < 2) return null;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (!first.accounts_total_rub) return null;
    return ((last.accounts_total_rub - first.accounts_total_rub) / first.accounts_total_rub) * 100;
  }, [points]);

  const profitTotal = useMemo(() => points.reduce((s, p) => s + (p.profit_rub ?? 0), 0), [points]);

  if (points.length < 2) {
    return (
      <PfCard className="mb-6 p-8 text-center text-[13.5px] text-[var(--v2-ink-500)]">
        Недостаточно данных для графиков — нужно минимум 2 месяца
      </PfCard>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="v2-tight text-[16px] font-semibold text-[var(--v2-ink-900)]">Графики</h2>
          <div className="inline-flex rounded-xl bg-[var(--v2-ink-100)]/80 p-1">
            <button
              type="button"
              onClick={() => onModeChange("capital")}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                mode === "capital"
                  ? "bg-white text-[var(--v2-brand-700)] shadow-[var(--v2-shadow-card)]"
                  : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              Капитал
            </button>
            <button
              type="button"
              onClick={() => onModeChange("profit")}
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
                mode === "profit"
                  ? "bg-white text-emerald-700 shadow-[var(--v2-shadow-card)]"
                  : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              Прибыль
            </button>
          </div>
        </div>
        {mode === "capital" && latest ? (
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--v2-ink-400)]">
              Сейчас на счетах
            </div>
            <div className="v2-tnum text-[18px] font-semibold text-[var(--v2-ink-900)]">
              {formatPersonalRubShort(latest.accounts_total_rub)}
            </div>
            {capitalDeltaPct != null ? (
              <div
                className={`v2-tnum text-[12px] font-medium ${capitalDeltaPct >= 0 ? "text-emerald-600" : "text-red-500"}`}
              >
                {capitalDeltaPct >= 0 ? "+" : "−"}
                {Math.abs(capitalDeltaPct).toFixed(1).replace(".", ",")}% за период
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--v2-ink-400)]">
              Сумма прибыли
            </div>
            <div className="v2-tnum text-[18px] font-semibold text-emerald-600">{formatPersonalRubShort(profitTotal)}</div>
            <div className="text-[12px] text-[var(--v2-ink-500)]">за весь период на графике</div>
          </div>
        )}
      </div>

      {mode === "capital" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PfCard className="overflow-hidden p-4 pt-5">
            <ChartCardHeader
              title="Капитал на счетах"
              expandHref={incomeHistoryChartExpandHref("capital-total", "capital")}
              legend={
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--v2-ink-500)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--v2-brand-500)]" />
                  динамика
                </span>
              }
            />
            <IncomeHistoryCapitalChart points={points} />
          </PfCard>
          <PfCard className="overflow-hidden p-4 pt-5">
            <ChartCardHeader
              title="Изменение помесячно"
              expandHref={incomeHistoryChartExpandHref("capital-delta", "capital")}
              legend={
                <span className="flex items-center gap-2 text-[11px] text-[var(--v2-ink-500)]">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                    рост
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-red-500" />
                    спад
                  </span>
                </span>
              }
            />
            <IncomeHistoryCapitalDeltaChart points={points} />
          </PfCard>
        </div>
      ) : (
        <PfCard className="overflow-hidden p-4 pt-5">
          <ChartCardHeader
            title="Прибыль"
            expandHref={incomeHistoryChartExpandHref("profit-total", "profit")}
            legend={
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--v2-ink-500)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                динамика
              </span>
            }
          />
          <IncomeHistoryProfitChart points={points} />
        </PfCard>
      )}
    </div>
  );
}

function PfCard({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-2xl bg-white shadow-[var(--v2-shadow-soft)] ${className}`}>{children}</div>;
}

export { getChartLayout };
export type { ChartLayout };
