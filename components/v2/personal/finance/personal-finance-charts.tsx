"use client";

import { formatPersonalRubShort } from "@/lib/v2/personal/formatters";
import type { PersonalMonthSnapshotRow } from "@/lib/v2/personal/types";
import { PERSONAL_MONTH_SHORT } from "@/lib/v2/personal/formatters";
import { useState } from "react";

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

export function PersonalCapitalChart({
  data,
  masked,
  currentYear,
  currentMonth,
}: {
  data: PersonalMonthSnapshotRow[];
  masked: boolean;
  currentYear: number;
  currentMonth: number;
}) {
  const W = 720;
  const H = 230;
  const padX = 18;
  const padTop = 22;
  const padBot = 34;
  const [hover, setHover] = useState(() => Math.max(0, data.length - 1));
  const vals = data.map((d) => d.capital_total_rub);
  if (vals.length < 2) return null;
  const rawMin = Math.min(...vals);
  const rawMax = Math.max(...vals);
  const span = rawMax - rawMin || Math.max(rawMax, 1) * 0.1 || 1;
  const min = rawMin - span * 0.02;
  const max = rawMax + span * 0.02;

  const X = (i: number) => padX + (i * (W - padX * 2)) / (data.length - 1);
  const Y = (v: number) => padTop + (1 - (v - min) / (max - min)) * (H - padTop - padBot);
  const pts = data.map((d, i) => ({ x: X(i), y: Y(d.capital_total_rub) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1]!.x} ${H - padBot} L ${pts[0]!.x} ${H - padBot} Z`;
  const hp = pts[hover];
  const hd = data[hover];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ display: "block" }}
      onMouseLeave={() => setHover(data.length - 1)}
    >
      <defs>
        <linearGradient id="pfCapFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B6FF7" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3B6FF7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => {
        const y = padTop + t * (H - padTop - padBot);
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
      <path d={area} fill="url(#pfCapFill)" />
      <path d={line} fill="none" stroke="#3B6FF7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const isCurrent = data[i]!.year === currentYear && data[i]!.month === currentMonth;
        return (
          <g key={i}>
            <rect
              x={p.x - (W - padX * 2) / (data.length - 1) / 2}
              y={0}
              width={(W - padX * 2) / (data.length - 1)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: "pointer" }}
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={i === hover ? 4.5 : 0}
              fill="#fff"
              stroke="#3B6FF7"
              strokeWidth="2.4"
            />
            <text
              x={p.x}
              y={H - 12}
              textAnchor="middle"
              fontSize="11"
              fill="#A1A1AA"
              fontWeight={isCurrent ? 700 : 500}
            >
              {PERSONAL_MONTH_SHORT[(data[i]!.month - 1) % 12]}
            </text>
          </g>
        );
      })}
      {hp && hd ? (
        <g>
          <line
            x1={hp.x}
            x2={hp.x}
            y1={padTop}
            y2={H - padBot}
            stroke="#3B6FF7"
            strokeOpacity="0.25"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <g transform={`translate(${Math.min(Math.max(hp.x, 64), W - 64)}, ${Math.max(hp.y - 14, 30)})`}>
            <rect x={-58} y={-30} width={116} height={34} rx={9} fill="#0A0A0B" />
            <text x={0} y={-15} textAnchor="middle" fontSize="10.5" fill="#A1A1AA">
              {PERSONAL_MONTH_SHORT[hd.month - 1]} {hd.year}
            </text>
            <text x={0} y={-1} textAnchor="middle" fontSize="13" fontWeight="600" fill="#fff" className="font-mono">
              {masked ? "••• ₽" : formatPersonalRubShort(hd.capital_total_rub)}
            </text>
          </g>
        </g>
      ) : null}
    </svg>
  );
}

export function PersonalIncomeBars({
  data,
  masked,
  currentYear,
  currentMonth,
}: {
  data: PersonalMonthSnapshotRow[];
  masked: boolean;
  currentYear: number;
  currentMonth: number;
}) {
  const W = 720;
  const H = 230;
  const padX = 22;
  const padTop = 18;
  const padBot = 34;
  const [hover, setHover] = useState(() => Math.max(0, data.length - 1));
  const earned = data.map((d) => d.earned_rub);
  const spent = data.map((d) => d.spent_rub);
  if (data.length < 2) return null;
  const rawMax = Math.max(...earned, ...spent, 1);
  const max = rawMax * 1.05;
  const slot = (W - padX * 2) / data.length;
  const bw = Math.min(slot * 0.3, 18);
  const Y = (v: number) => padTop + (1 - v / max) * (H - padTop - padBot);
  const base = H - padBot;
  const hd = data[hover];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
      <defs>
        <linearGradient id="pfEarnFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B6FF7" />
          <stop offset="100%" stopColor="#2A56EB" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t, i) => {
        const y = padTop + t * (H - padTop - padBot);
        return (
          <line key={i} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#0A0A0B" strokeOpacity="0.05" strokeWidth="1" />
        );
      })}
      {data.map((d, i) => {
        const cx = padX + slot * i + slot / 2;
        const on = i === hover;
        const isCurrent = d.year === currentYear && d.month === currentMonth;
        return (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: "pointer" }}>
            <rect x={padX + slot * i} y={0} width={slot} height={H} fill="transparent" />
            <rect
              x={cx - bw - 2}
              y={Y(d.spent_rub)}
              width={bw}
              height={base - Y(d.spent_rub)}
              rx={4}
              fill="#E4E4E7"
              opacity={on ? 1 : 0.85}
            />
            <rect
              x={cx + 2}
              y={Y(d.earned_rub)}
              width={bw}
              height={base - Y(d.earned_rub)}
              rx={4}
              fill="url(#pfEarnFill)"
              opacity={on ? 1 : 0.9}
            />
            <text
              x={cx}
              y={H - 12}
              textAnchor="middle"
              fontSize="11"
              fill="#A1A1AA"
              fontWeight={isCurrent ? 700 : 500}
            >
              {PERSONAL_MONTH_SHORT[d.month - 1]}
            </text>
          </g>
        );
      })}
      {hd ? (
        <g
          transform={`translate(${Math.min(Math.max(padX + slot * hover + slot / 2, 76), W - 76)}, ${padTop + 6})`}
        >
          <rect x={-72} y={-2} width={144} height={44} rx={9} fill="#0A0A0B" />
          <circle cx={-58} cy={14} r={3.5} fill="#3B6FF7" />
          <text x={-49} y={18} fontSize="11" fill="#fff" className="font-mono">
            {masked ? "•••" : formatPersonalRubShort(hd.earned_rub)}
          </text>
          <circle cx={-58} cy={30} r={3.5} fill="#A1A1AA" />
          <text x={-49} y={34} fontSize="11" fill="#D4D4D8" className="font-mono">
            {masked ? "•••" : formatPersonalRubShort(hd.spent_rub)}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function PersonalSpark({
  data,
  w = 96,
  h = 30,
  color = "#3B6FF7",
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => ({
    x: (i * (w - 4)) / (data.length - 1) + 2,
    y: 2 + (1 - (v - min) / ((max - min) || 1)) * (h - 4),
  }));
  const line = smoothPath(pts);
  const gradId = `pfSp${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${line} L ${pts[pts.length - 1]!.x} ${h} L ${pts[0]!.x} ${h} Z`}
        fill={`url(#${gradId})`}
      />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
