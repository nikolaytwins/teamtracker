"use client";

import { PersonalAmt } from "./personal-finance-mask";
import { formatPersonalRub, formatPersonalRubShort, PERSONAL_MONTH_NAMES } from "@/lib/v2/personal/formatters";
import type { PersonalMonthSnapshotRow } from "@/lib/v2/personal/types";
import { useMemo, useState } from "react";

export type TxCatRow = {
  id: string;
  name: string;
  tint: string;
  amount: number;
  pct: number;
  avg: number;
};

export function monthLabel(year: number, month: number) {
  return `${PERSONAL_MONTH_NAMES[month - 1]} ${year}`;
}

export function dayShortLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function txnTimeLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function TransactionsHero({
  year,
  month,
  incomeTotal,
  expenseTotal,
  isCurrentMonth,
  onPrev,
  onNext,
  actions,
}: {
  year: number;
  month: number;
  incomeTotal: number;
  expenseTotal: number;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  actions?: React.ReactNode;
}) {
  const diff = incomeTotal - expenseTotal;
  return (
    <section className="card hero">
      <div className="hero-l">
        <div className="hero-top">
          <span className="kick">Финансы</span>
          {isCurrentMonth ? <span className="wk-badge">этот месяц</span> : null}
          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </div>
        <h1 className="hero-h1">{monthLabel(year, month)}</h1>
        <div className="wk-nav">
          <button type="button" className="wk-btn tip" data-tip="Прошлый месяц" onClick={onPrev}>
            ‹
          </button>
          <span className="wk-label tnum">{monthLabel(year, month)}</span>
          <button type="button" className="wk-btn tip" data-tip="Следующий месяц" onClick={onNext}>
            ›
          </button>
        </div>
        <div className="kpis">
          <div className="kpi kpi--soft">
            <div className="kpi-k">Приход</div>
            <div className="kpi-v tnum pos">
              <PersonalAmt v={incomeTotal} />
            </div>
          </div>
          <div className="kpi kpi--soft">
            <div className="kpi-k">Расход</div>
            <div className="kpi-v tnum">
              <PersonalAmt v={expenseTotal} />
            </div>
          </div>
          <div className="kpi kpi--main">
            <div className="kpi-k">Разница</div>
            <div className="kpi-v tnum">
              <PersonalAmt v={diff} signed />
            </div>
          </div>
        </div>
      </div>
      <div className="hero-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/v2/transactions-hero.png" alt="" />
      </div>
    </section>
  );
}

export function CategoryBreakdown({
  title,
  subtitle,
  rows,
  activeId,
  onSelect,
  positive,
  footer,
}: {
  title: string;
  subtitle: string;
  rows: TxCatRow[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  positive?: boolean;
  footer?: React.ReactNode;
}) {
  const max = rows[0]?.amount ?? 1;
  return (
    <section className="card pad">
      <div className="sec-head">
        <h2 className="sec-title">{title}</h2>
        <span className="sec-sub">{subtitle}</span>
      </div>
      <div className="cbs">
        {rows.length === 0 ? (
          <p className="dr-note">В этом месяце операций нет.</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`cb${activeId === row.id ? " on" : ""}`}
              onClick={() => onSelect(activeId === row.id ? null : row.id)}
            >
              <div className="cb-h">
                <span className="cb-n">{row.name}</span>
                <span className="cb-p tnum">{row.pct}%</span>
                <span className={`cb-s tnum${positive ? " pos" : ""}`}>{formatPersonalRub(row.amount)}</span>
              </div>
              <div className="cb-t">
                <div
                  className="cb-f"
                  style={{ width: `${Math.max((row.amount / max) * 100, 2)}%`, background: row.tint }}
                />
              </div>
              {row.avg > 0 ? (
                <div className="cb-a tnum">в среднем {formatPersonalRubShort(row.avg)} в месяц</div>
              ) : null}
            </button>
          ))
        )}
      </div>
      {footer}
    </section>
  );
}

export function TransactionsTrendChart({
  data,
  currentYear,
  currentMonth,
  onPickMonth,
}: {
  data: PersonalMonthSnapshotRow[];
  currentYear: number;
  currentMonth: number;
  onPickMonth: (year: number, month: number) => void;
}) {
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);
  const points = useMemo(() => {
    const sorted = [...data].sort((a, b) => a.year - b.year || a.month - b.month);
    return sorted.slice(-6);
  }, [data]);

  if (points.length === 0) {
    return <p className="dr-note">Недостаточно данных для графика.</p>;
  }

  const W = 1000;
  const H = 250;
  const PL = 54;
  const PR = 16;
  const PT = 14;
  const PB = 34;
  const iw = W - PL - PR;
  const ih = H - PT - PB;
  const mapped = points.map((p) => ({
    ...p,
    inc: p.earned_rub,
    out: p.spent_rub,
    prof: p.earned_rub - p.spent_rub,
  }));
  const max = Math.max(...mapped.map((d) => Math.max(d.inc, d.out)), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max))) / 2;
  const top = Math.ceil(max / step) * step;
  const x = (i: number) => PL + (mapped.length === 1 ? iw / 2 : (i * iw) / (mapped.length - 1));
  const y = (v: number) => PT + ih - (v / top) * ih;
  const path = (k: "inc" | "out") =>
    mapped.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(" ");
  const area = `${path("inc")} L${x(mapped.length - 1).toFixed(1)} ${PT + ih} L${x(0).toFixed(1)} ${PT + ih} Z`;
  const avg = Math.round(mapped.reduce((s, d) => s + d.prof, 0) / mapped.length);

  const grid: React.ReactNode[] = [];
  for (let v = 0; v <= top + 1; v += step) {
    grid.push(
      <line key={v} className="tr-g" x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} />,
      <text key={`t${v}`} className="tr-yl" x={PL - 10} y={y(v) + 4} textAnchor="end">
        {v ? formatPersonalRubShort(v) : "0"}
      </text>
    );
  }

  return (
    <section className="card pad">
      <div className="sec-head">
        <h2 className="sec-title">Приход и расход по месяцам</h2>
        <span className="sec-sub mini">нажмите на месяц</span>
      </div>
      <div className="trend">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
          <defs>
            <linearGradient id="tx-gin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2d5eef" stopOpacity="0.22" />
              <stop offset="1" stopColor="#2d5eef" stopOpacity="0" />
            </linearGradient>
          </defs>
          {grid}
          <path d={area} fill="url(#tx-gin)" />
          <path d={path("inc")} fill="none" stroke="#2d5eef" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <path
            d={path("out")}
            fill="none"
            stroke="#E5604D"
            strokeWidth="3"
            strokeDasharray="7 6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {mapped.map((d, i) => (
            <circle
              key={`out-${d.year}-${d.month}`}
              className="tr-dot"
              cx={x(i)}
              cy={y(d.out)}
              r={d.year === currentYear && d.month === currentMonth ? 6 : 4.5}
              fill="#fff"
              stroke="#E5604D"
              strokeWidth="3"
            />
          ))}
          {mapped.map((d, i) => (
            <circle
              key={`in-${d.year}-${d.month}`}
              className="tr-dot"
              cx={x(i)}
              cy={y(d.inc)}
              r={d.year === currentYear && d.month === currentMonth ? 6 : 4.5}
              fill="#fff"
              stroke="#2d5eef"
              strokeWidth="3"
            />
          ))}
          {mapped.map((d, i) => (
            <text
              key={`lbl-${d.year}-${d.month}`}
              className={`tr-xl${d.year === currentYear && d.month === currentMonth ? " now" : ""}`}
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
            >
              {PERSONAL_MONTH_NAMES[d.month - 1]?.slice(0, 3)}
            </text>
          ))}
          {mapped.map((d, i) => {
            const w = iw / mapped.length;
            return (
              <rect
                key={`hit-${d.year}-${d.month}`}
                className="tr-hit"
                x={PL + i * w}
                y={PT}
                width={w}
                height={ih}
                rx={10}
                onMouseEnter={(e) => {
                  const box = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  const sx = box ? ((x(i) / W) * box.width) : 0;
                  const sy = box ? ((y(Math.max(d.inc, d.out)) / H) * box.height) : 0;
                  setTip({
                    x: sx,
                    y: Math.max(sy - 14, 52),
                    html: `<b>${monthLabel(d.year, d.month)}</b><br/>Приход ${formatPersonalRub(d.inc)}<br/>Расход ${formatPersonalRub(d.out)}<br/>Разница ${formatPersonalRub(d.prof)}`,
                  });
                }}
                onMouseLeave={() => setTip(null)}
                onClick={() => onPickMonth(d.year, d.month)}
              />
            );
          })}
        </svg>
        {tip ? (
          <div
            className="tr-tip on"
            style={{ left: tip.x, top: tip.y }}
            dangerouslySetInnerHTML={{ __html: tip.html }}
          />
        ) : null}
      </div>
      <div className="blegend">
        <span className="blg">
          <span style={{ background: "var(--brand-500)" }} />
          Приход
        </span>
        <span className="blg">
          <span style={{ background: "#E5604D" }} />
          Расход
        </span>
        <span className="blg" id="bars-note">
          Средняя разница: {formatPersonalRub(avg)}
        </span>
      </div>
    </section>
  );
}
