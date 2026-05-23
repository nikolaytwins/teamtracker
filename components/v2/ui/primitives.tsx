"use client";

import { PRIORITY_META, V2Icons } from "@/components/v2/ui/icons";
import type { V2TaskPriority } from "@/lib/v2/types";

export function ProjectChip({
  name,
  short,
  bg,
  tint,
  ink,
  size = "sm",
}: {
  name: string;
  short?: string | null;
  bg?: string | null;
  tint?: string | null;
  ink?: string | null;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  const letterColor = ink ?? tint ?? "#333";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white shadow-[var(--v2-shadow-card)] text-[var(--v2-ink-700)] ${
        isSm ? "py-[3px] pl-1 pr-2.5 text-[12px]" : "py-1 pl-1.5 pr-3 text-[13px]"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full font-semibold ${
          isSm ? "h-[18px] w-[18px] text-[10.5px]" : "h-5 w-5 text-[11px]"
        }`}
        style={{ background: bg ?? "#eee", color: letterColor }}
      >
        {short ?? name.slice(0, 1)}
      </span>
      <span className="v2-tight font-medium">{name}</span>
    </span>
  );
}

export function PriorityDot({ priority }: { priority: V2TaskPriority }) {
  const m = PRIORITY_META[priority];
  return (
    <span className="inline-flex items-center gap-1.5">
      <V2Icons.flag className="h-3.5 w-3.5 shrink-0" style={{ color: m.dot }} />
      <span className="v2-tight text-[12px] text-[var(--v2-ink-600)]">{m.label}</span>
    </span>
  );
}

export function TaskCheckbox({
  checked,
  onChange,
  accent = "#3B6FF7",
}: {
  checked: boolean;
  onChange: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      aria-pressed={checked}
      className={`v2-ring-focus inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[7px] border transition-all duration-200 ${
        checked ? "v2-check-on border-transparent" : "border-[var(--v2-ink-300)] bg-white hover:border-[var(--v2-brand-400)] hover:bg-[var(--v2-brand-50)]/60"
      }`}
      style={{ background: checked ? accent : undefined }}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
        <path
          className="v2-check-path"
          d="m5.5 12.5 4.2 4.2 9-9"
          stroke={checked ? "white" : "transparent"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export function IconBtn({
  children,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)] ${className}`}
    >
      {children}
    </button>
  );
}

export function TimerButton({
  running,
  onClick,
  size = "md",
}: {
  running: boolean;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const px = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const ip = size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={running ? "Пауза" : "Запустить таймер"}
      className={`v2-ring-focus group relative inline-flex items-center justify-center rounded-full transition-all duration-300 ${px} ${
        running
          ? "v2-breathe bg-[var(--v2-brand-600)] text-white shadow-[var(--v2-shadow-glow)] hover:bg-[var(--v2-brand-700)]"
          : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:text-[var(--v2-brand-600)] hover:shadow-[var(--v2-shadow-cardHv)]"
      }`}
    >
      {running ? <V2Icons.pause className={ip} /> : <V2Icons.play className={`${ip} translate-x-px`} />}
    </button>
  );
}

export function Ring({
  value,
  total,
  size = 72,
  stroke = 8,
  color = "#3B6FF7",
  track = "#E4E4E7",
  label,
  sub,
}: {
  value: number | string;
  total?: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total && typeof value === "number" ? Math.min(value / total, 1) : 0;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.7,.2,1)" }}
        />
      </svg>
      <div className="leading-tight">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">{label}</div>
        <div className="v2-tight v2-tnum mt-0.5 text-[20px] font-semibold text-[var(--v2-ink-900)]">
          {value}
          {total ? <span className="font-normal text-[var(--v2-ink-400)]">/{total}</span> : null}
        </div>
        {sub ? <div className="mt-0.5 text-[12px] text-[var(--v2-ink-500)]">{sub}</div> : null}
      </div>
    </div>
  );
}
