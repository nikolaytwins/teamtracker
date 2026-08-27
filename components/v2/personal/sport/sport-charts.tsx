"use client";

import { useMemo, useState } from "react";
import { n1, sgn, weekChartLabel } from "@/lib/v2/personal/sport-helpers";
import { SpCard, SpDelta } from "@/components/v2/personal/sport/sport-primitives";

export type SportChartPoint = { x: string; y: number | null };

function chartGeometry(pts: SportChartPoint[], height: number) {
  const vals = pts.map((p) => p.y).filter((v): v is number => v != null);
  const W = 300;
  const H = height;
  const pad = 8;
  if (vals.length < 2) return null;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const y0 = lo - span * 0.28;
  const y1 = hi + span * 0.28;
  const X = (i: number) => pad + (i * (W - pad * 2)) / (pts.length - 1);
  const Y = (v: number) => H - ((v - y0) / (y1 - y0)) * H;
  const line = pts.map((p, i) => `${X(i)},${Y(p.y!)}`).join(" ");
  const area = `${pad},${H} ${line} ${W - pad},${H}`;
  const last = vals[vals.length - 1]!;
  const first = vals[0]!;
  return { W, H, pad, line, area, last, first, X, Y, vals };
}

function SportChartSvg({
  title,
  unit,
  color,
  pts,
  dec = 1,
  height = 132,
  compact = false,
}: {
  title: string;
  unit: string;
  color: string;
  pts: SportChartPoint[];
  dec?: number;
  height?: number;
  compact?: boolean;
}) {
  const geo = useMemo(() => chartGeometry(pts, height), [pts, height]);
  const gid = `g-${title.replace(/[^a-zA-Zа-яА-Я]/g, "")}`;

  if (!geo) {
    return (
      <SpCard className="flex flex-col items-center justify-center p-4" style={{ minHeight: height + 72 }}>
        <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{title}</div>
        <div className="mt-1 text-[12px] text-[var(--v2-ink-400)]">Мало данных</div>
      </SpCard>
    );
  }

  const { W, H, line, area, last, first, X, Y } = geo;

  return (
    <SpCard className={compact ? "p-4" : "p-5"}>
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{title}</div>
          <div className="mt-0.5 text-[11.5px] text-[var(--v2-ink-400)]">
            от старта <SpDelta v={last - first} d={dec} good="none" size="11.5px" />
          </div>
        </div>
        <div className="whitespace-nowrap text-right leading-none">
          <span className="v2-tighter v2-tnum text-[24px] font-semibold" style={{ color }}>
            {last.toFixed(dec)}
          </span>
          <span className="ml-1 text-[12px] text-[var(--v2-ink-400)]">{unit}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gid})`} />
        <polyline
          points={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {pts.map((p, i) =>
          p.y == null ? null : (
            <circle
              key={i}
              cx={X(i)}
              cy={Y(p.y)}
              r={i === pts.length - 1 ? 3.6 : 2.4}
              fill={i === pts.length - 1 ? color : "#fff"}
              stroke={color}
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
          )
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[10.5px] text-[var(--v2-ink-400)]">
        {pts.map((p, i) => (
          <span key={i} className={i === pts.length - 1 ? "font-medium text-[var(--v2-ink-700)]" : ""}>
            {p.x}
          </span>
        ))}
      </div>
    </SpCard>
  );
}

function SportChartModal({
  open,
  onClose,
  title,
  unit,
  color,
  pts,
  dec,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  unit: string;
  color: string;
  pts: SportChartPoint[];
  dec: number;
}) {
  if (!open) return null;
  const geo = chartGeometry(pts, 280);
  const vals = pts.filter((p) => p.y != null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="v2-card max-h-[90vh] w-full max-w-[720px] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="v2-tight text-[20px] font-semibold text-[var(--v2-ink-900)]">{title}</h3>
            <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">Вся история по неделям</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
          >
            Закрыть
          </button>
        </div>

        {geo ? (
          <>
            <svg viewBox={`0 0 680 280`} className="w-full" style={{ height: 280 }}>
              <defs>
                <linearGradient id="sp-modal-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((t, i) => {
                const y = 16 + t * 248;
                return (
                  <line
                    key={i}
                    x1={32}
                    x2={648}
                    y1={y}
                    y2={y}
                    stroke="#0A0A0B"
                    strokeOpacity="0.05"
                    strokeWidth="1"
                  />
                );
              })}
              {(() => {
                const W = 680;
                const H = 280;
                const padX = 32;
                const padY = 16;
                const plotH = H - padY * 2;
                const lo = Math.min(...geo.vals);
                const hi = Math.max(...geo.vals);
                const span = hi - lo || 1;
                const y0 = lo - span * 0.2;
                const y1 = hi + span * 0.2;
                const X = (i: number) => padX + (i * (W - padX * 2)) / (pts.length - 1);
                const Y = (v: number) => padY + plotH - ((v - y0) / (y1 - y0)) * plotH;
                const line = pts.map((p, i) => (p.y != null ? `${X(i)},${Y(p.y)}` : null)).filter(Boolean).join(" ");
                const area = `${padX},${padY + plotH} ${line} ${W - padX},${padY + plotH}`;
                return (
                  <>
                    <polygon points={area} fill="url(#sp-modal-fill)" />
                    <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
                    {pts.map((p, i) =>
                      p.y == null ? null : (
                        <g key={i}>
                          <circle cx={X(i)} cy={Y(p.y)} r={i === pts.length - 1 ? 5 : 3.5} fill={color} />
                          <text
                            x={X(i)}
                            y={H - 4}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#71717A"
                            fontWeight={i === pts.length - 1 ? 600 : 400}
                          >
                            {p.x}
                          </text>
                        </g>
                      )
                    )}
                  </>
                );
              })()}
            </svg>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {vals.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-[var(--v2-ink-50)] px-3 py-2"
                >
                  <span className="text-[13px] text-[var(--v2-ink-600)]">{p.x}</span>
                  <span className="v2-tnum text-[14px] font-semibold" style={{ color }}>
                    {n1(p.y)}
                    {unit}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-[14px] text-[var(--v2-ink-400)]">Мало данных для графика</div>
        )}
      </div>
    </div>
  );
}

export function SportChartCard({
  title,
  unit,
  color,
  pts,
  dec = 1,
}: {
  title: string;
  unit: string;
  color: string;
  pts: SportChartPoint[];
  dec?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasData = pts.filter((p) => p.y != null).length >= 2;

  return (
    <>
      <button
        type="button"
        onClick={() => hasData && setOpen(true)}
        className={`block w-full text-left transition ${hasData ? "cursor-pointer hover:scale-[1.01]" : "cursor-default"}`}
      >
        <SportChartSvg title={title} unit={unit} color={color} pts={pts} dec={dec} compact />
      </button>
      <SportChartModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        unit={unit}
        color={color}
        pts={pts}
        dec={dec}
      />
    </>
  );
}

export function buildSportChartPoints(
  rows: Array<{ label: string; a?: { w?: number | null; f?: number | null; l?: number | null } | null }>,
  sel: (a: { w?: number | null; f?: number | null; l?: number | null }) => number | null
): SportChartPoint[] {
  return rows
    .map((r) => ({
      x: weekChartLabel(r.label),
      y: r.a ? sel(r.a) : null,
    }))
    .filter((p) => p.y != null);
}

export function SportChartsGrid({
  rows,
}: {
  rows: Array<{ label: string; a?: { w?: number | null; f?: number | null; l?: number | null } | null }>;
}) {
  const fat = (a: { w?: number | null; f?: number | null }) =>
    a.w && a.f != null ? (a.f / a.w) * 100 : null;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
      <SportChartCard
        title="Вес"
        unit="кг"
        color="#3B6FF7"
        pts={buildSportChartPoints(rows, (a) => a.w ?? null)}
        dec={1}
      />
      <SportChartCard
        title="Процент жира"
        unit="%"
        color="#F59E0B"
        pts={buildSportChartPoints(rows, (a) => fat(a))}
        dec={1}
      />
      <SportChartCard
        title="Безжировая масса"
        unit="кг"
        color="#047857"
        pts={buildSportChartPoints(rows, (a) => a.l ?? null)}
        dec={1}
      />
    </div>
  );
}
