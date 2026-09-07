"use client";

import { useMemo, useState } from "react";
import { n1, sgn, weekChartLabel } from "@/lib/v2/personal/sport-helpers";
import { SP_PRE_DIET_MONTHS } from "@/lib/v2/personal/seeds/sport-seed";
import { SpCard, SpDelta } from "@/components/v2/personal/sport/sport-primitives";

export type SportChartPoint = { x: string; y: number | null };

export type SportChartMetric = "w" | "fatPct" | "l";

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
  interactive = true,
}: {
  title: string;
  unit: string;
  color: string;
  pts: SportChartPoint[];
  dec?: number;
  height?: number;
  compact?: boolean;
  interactive?: boolean;
}) {
  const geo = useMemo(() => chartGeometry(pts, height), [pts, height]);
  const gid = `g-${title.replace(/[^a-zA-Zа-яА-Я]/g, "")}`;
  const [hover, setHover] = useState<number | null>(() =>
    pts.length ? pts.length - 1 : null
  );

  if (!geo) {
    return (
      <SpCard className="flex flex-col items-center justify-center p-4" style={{ minHeight: height + 72 }}>
        <div className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{title}</div>
        <div className="mt-1 text-[12px] text-[var(--v2-ink-400)]">Мало данных</div>
      </SpCard>
    );
  }

  const { W, H, line, area, last, first, X, Y } = geo;
  const hi = hover != null && pts[hover]?.y != null ? hover : pts.length - 1;
  const hp = pts[hi];
  const hx = X(hi);
  const hy = hp?.y != null ? Y(hp.y) : 0;
  const colW = pts.length > 1 ? (W - geo.pad * 2) / (pts.length - 1) : W;

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
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        style={{ height }}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(pts.length - 1)}
      >
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
        {interactive
          ? pts.map((p, i) =>
              p.y == null ? null : (
                <rect
                  key={`hit-${i}`}
                  x={X(i) - colW / 2}
                  y={0}
                  width={colW}
                  height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  style={{ cursor: "pointer" }}
                />
              )
            )
          : null}
        {pts.map((p, i) =>
          p.y == null ? null : (
            <circle
              key={i}
              cx={X(i)}
              cy={Y(p.y)}
              r={i === hi ? 4.2 : 2.4}
              fill={i === hi ? color : "#fff"}
              stroke={color}
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )
        )}
        {interactive && hp?.y != null ? (
          <g pointerEvents="none">
            <line
              x1={hx}
              x2={hx}
              y1={8}
              y2={H - 4}
              stroke={color}
              strokeOpacity="0.2"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <g transform={`translate(${Math.min(Math.max(hx, 52), W - 52)}, ${Math.max(hy - 10, 22)})`}>
              <rect x={-46} y={-28} width={92} height={34} rx={8} fill="#0A0A0B" />
              <text x={0} y={-14} textAnchor="middle" fontSize="10" fill="#A1A1AA">
                {hp.x}
              </text>
              <text x={0} y={-1} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#fff">
                {hp.y!.toFixed(dec)} {unit}
              </text>
            </g>
          </g>
        ) : null}
      </svg>
      <div className="mt-2 flex justify-between text-[10.5px] text-[var(--v2-ink-400)]">
        {pts.map((p, i) => (
          <span key={i} className={i === hi ? "v2-tnum font-semibold text-[var(--v2-ink-800)]" : ""}>
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
  dietStartIndex,
  dec,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  unit: string;
  color: string;
  pts: SportChartPoint[];
  dietStartIndex: number;
  dec: number;
}) {
  const [hover, setHover] = useState<number | null>(() => (pts.length ? pts.length - 1 : null));

  if (!open) return null;

  const vals = pts.filter((p) => p.y != null);
  const first = vals[0]?.y ?? null;
  const last = vals[vals.length - 1]?.y ?? null;
  const honestDelta = first != null && last != null ? last - first : null;

  const W = 680;
  const H = 300;
  const padX = 32;
  const padY = 28;
  const plotH = H - padY * 2 - 18;
  const numPts = Math.max(pts.length, 2);
  const X = (i: number) => padX + (i * (W - padX * 2)) / (numPts - 1);

  const yVals = pts.map((p) => p.y).filter((v): v is number => v != null);
  const hasGeo = yVals.length >= 2;
  const lo = hasGeo ? Math.min(...yVals) : 0;
  const maxVal = hasGeo ? Math.max(...yVals) : 1;
  const span = maxVal - lo || 1;
  const y0 = lo - span * 0.2;
  const y1 = maxVal + span * 0.2;
  const Y = (v: number) => padY + plotH - ((v - y0) / (y1 - y0)) * plotH;

  const linePts = pts
    .map((p, i) => (p.y != null ? `${X(i)},${Y(p.y)}` : null))
    .filter(Boolean)
    .join(" ");
  const area = `${padX},${padY + plotH} ${linePts} ${W - padX},${padY + plotH}`;
  const colW = (W - padX * 2) / (numPts - 1);
  const hoverIdx = hover != null && pts[hover]?.y != null ? hover : pts.length - 1;
  const hp = pts[hoverIdx];
  const hx = X(hoverIdx);
  const hy = hp?.y != null ? Y(hp.y) : 0;

  const dividerX =
    dietStartIndex > 0 && dietStartIndex < pts.length
      ? (X(dietStartIndex - 1) + X(dietStartIndex)) / 2
      : null;

  const prePts = pts.slice(0, dietStartIndex);
  const postPts = pts.slice(dietStartIndex);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="v2-card max-h-[90vh] w-full max-w-[760px] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="v2-tight text-[20px] font-semibold text-[var(--v2-ink-900)]">{title}</h3>
            <p className="mt-1 text-[13px] text-[var(--v2-ink-500)]">
              До диеты (месяцы) → после старта питания (недели)
              {honestDelta != null ? (
                <>
                  {" · "}
                  честный прогресс{" "}
                  <span className="v2-tnum font-semibold text-[var(--v2-ink-800)]">
                    {sgn(honestDelta, dec)}
                    {unit}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] text-[var(--v2-ink-500)] hover:bg-[var(--v2-ink-50)]"
          >
            Закрыть
          </button>
        </div>

        {hasGeo ? (
          <>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full"
              style={{ height: 300 }}
              onMouseLeave={() => setHover(pts.length - 1)}
            >
              <defs>
                <linearGradient id="sp-modal-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((t, i) => {
                const y = padY + t * plotH;
                return (
                  <line
                    key={i}
                    x1={padX}
                    x2={W - padX}
                    y1={y}
                    y2={y}
                    stroke="#0A0A0B"
                    strokeOpacity="0.05"
                    strokeWidth="1"
                  />
                );
              })}
              <polygon points={area} fill="url(#sp-modal-fill)" />
              <polyline points={linePts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />

              {dividerX != null ? (
                <g pointerEvents="none">
                  <line
                    x1={dividerX}
                    x2={dividerX}
                    y1={padY - 6}
                    y2={padY + plotH + 4}
                    stroke="#71717A"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                    strokeOpacity="0.85"
                  />
                  <rect x={dividerX - 28} y={6} width={56} height={16} rx={4} fill="#fff" />
                  <text
                    x={dividerX}
                    y={17.5}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="600"
                    fill="#71717A"
                  >
                    Диета
                  </text>
                </g>
              ) : null}

              {pts.map((p, i) =>
                p.y == null ? null : (
                  <rect
                    key={`mhit-${i}`}
                    x={X(i) - colW / 2}
                    y={0}
                    width={colW}
                    height={H}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    style={{ cursor: "pointer" }}
                  />
                )
              )}
              {pts.map((p, i) =>
                p.y == null ? null : (
                  <g key={i} pointerEvents="none">
                    <circle
                      cx={X(i)}
                      cy={Y(p.y)}
                      r={i === hoverIdx ? 5.5 : i < dietStartIndex ? 3 : 3.5}
                      fill={i < dietStartIndex ? "#fff" : color}
                      stroke={color}
                      strokeWidth={i < dietStartIndex ? 1.8 : 0}
                    />
                    <text
                      x={X(i)}
                      y={H - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fill={i === hoverIdx ? "#18181B" : "#71717A"}
                      fontWeight={i === hoverIdx ? 600 : 400}
                    >
                      {p.x}
                    </text>
                  </g>
                )
              )}
              {hp?.y != null ? (
                <g pointerEvents="none">
                  <line
                    x1={hx}
                    x2={hx}
                    y1={padY}
                    y2={padY + plotH}
                    stroke={color}
                    strokeOpacity="0.25"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <g transform={`translate(${Math.min(Math.max(hx, 64), W - 64)}, ${Math.max(hy - 12, 40)})`}>
                    <rect x={-58} y={-32} width={116} height={38} rx={9} fill="#0A0A0B" />
                    <text x={0} y={-16} textAnchor="middle" fontSize="10.5" fill="#A1A1AA">
                      {hp.x}
                      {hoverIdx < dietStartIndex ? " · до диеты" : ""}
                    </text>
                    <text x={0} y={-1} textAnchor="middle" fontSize="13" fontWeight="600" fill="#fff">
                      {hp.y!.toFixed(dec)} {unit}
                    </text>
                  </g>
                </g>
              ) : null}
            </svg>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  До диеты
                </div>
                <div className="grid gap-2">
                  {prePts.map((p, i) => (
                    <div
                      key={`pre-${i}`}
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
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-400)]">
                  После старта
                </div>
                <div className="grid gap-2">
                  {postPts.map((p, i) => (
                    <div
                      key={`post-${i}`}
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
              </div>
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
  metric,
  dec = 1,
}: {
  title: string;
  unit: string;
  color: string;
  pts: SportChartPoint[];
  metric: SportChartMetric;
  dec?: number;
}) {
  const [open, setOpen] = useState(false);
  const hasData = pts.filter((p) => p.y != null).length >= 2;
  const fullscreen = useMemo(() => buildFullscreenSportChartPoints(pts, metric), [pts, metric]);

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
        pts={fullscreen.pts}
        dietStartIndex={fullscreen.dietStartIndex}
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

export function buildFullscreenSportChartPoints(
  weekly: SportChartPoint[],
  metric: SportChartMetric
): { pts: SportChartPoint[]; dietStartIndex: number } {
  const pre: SportChartPoint[] = SP_PRE_DIET_MONTHS.map((m) => ({
    x: m.label,
    y: metric === "w" ? m.w : metric === "fatPct" ? m.fatPct : m.l,
  }));
  return { pts: [...pre, ...weekly], dietStartIndex: pre.length };
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
        metric="w"
        pts={buildSportChartPoints(rows, (a) => a.w ?? null)}
        dec={1}
      />
      <SportChartCard
        title="Процент жира"
        unit="%"
        color="#F59E0B"
        metric="fatPct"
        pts={buildSportChartPoints(rows, (a) => fat(a))}
        dec={1}
      />
      <SportChartCard
        title="Безжировая масса"
        unit="кг"
        color="#047857"
        metric="l"
        pts={buildSportChartPoints(rows, (a) => a.l ?? null)}
        dec={1}
      />
    </div>
  );
}
