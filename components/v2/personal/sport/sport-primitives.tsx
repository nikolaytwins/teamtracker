"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { sgn } from "@/lib/v2/personal/sport-helpers";

export function SpCard({
  className = "",
  children,
  style,
  ...p
}: {
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div className={`v2-card ${className}`} style={style} {...p}>
      {children}
    </div>
  );
}

export function SpKick({ children, className = "text-[var(--v2-ink-400)]" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`text-[10.5px] font-semibold uppercase tracking-[0.13em] ${className}`}>{children}</div>
  );
}

export function SpSect({
  accent = "#0A0A0B",
  title,
  hint,
  right,
  children,
  id,
}: {
  accent?: string;
  title: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 24 }}>
      <div className="mb-3 flex items-center gap-2.5 px-0.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
        <h2 className="v2-tight text-[15px] font-semibold text-[var(--v2-ink-900)]">{title}</h2>
        {hint ? <span className="v2-tight text-[12.5px] text-[var(--v2-ink-500)]">{hint}</span> : null}
        {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

type SpInpProps = {
  value: string | number | null | undefined;
  onChange: (v: string) => void;
  w?: string;
  align?: "left" | "right" | "center";
  ph?: string;
  mono?: boolean;
  size?: string;
  bold?: boolean;
  className?: string;
} & Pick<InputHTMLAttributes<HTMLInputElement>, "onKeyDown">;

export function SpInp({
  value,
  onChange,
  w = "58px",
  align = "right",
  ph = "—",
  mono = true,
  size = "14px",
  bold = true,
  onKeyDown,
  className = "",
}: SpInpProps) {
  return (
    <input
      value={value == null ? "" : value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ph}
      onKeyDown={onKeyDown}
      className={`rounded-lg border border-transparent bg-transparent px-2 py-1.5 -mx-1 text-[var(--v2-ink-900)] outline-none transition hover:border-[var(--v2-ink-200)] hover:bg-[var(--v2-ink-50)]/60 focus:border-[var(--v2-brand-400)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,111,247,0.10)] ${mono ? "v2-tnum" : ""} ${bold ? "font-semibold" : ""} ${className}`}
      style={{ width: w, textAlign: align, fontSize: size }}
    />
  );
}

export function SpArea({
  value,
  onChange,
  ph = "",
  rows = 2,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  ph?: string;
  rows?: number;
  className?: string;
} & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows">) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ph}
      rows={rows}
      className={`w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1.5 -mx-1 text-[13.5px] leading-[1.5] text-[var(--v2-ink-700)] outline-none transition hover:border-[var(--v2-ink-200)] hover:bg-[var(--v2-ink-50)]/60 focus:border-[var(--v2-brand-400)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(59,111,247,0.10)] ${className}`}
    />
  );
}

export function SpDelta({
  v,
  d = 1,
  good = "down",
  unit = "",
  size = "13px",
}: {
  v: number | null | undefined;
  d?: number;
  good?: "down" | "up" | "none";
  unit?: string;
  size?: string;
}) {
  if (v == null || Number.isNaN(v)) {
    return <span className="text-[13px] text-[var(--v2-ink-300)]">—</span>;
  }
  const z = Math.abs(v) < 0.005;
  const ok = good === "none" ? null : good === "down" ? v < 0 : v > 0;
  const c = z ? "#A1A1AA" : ok === null ? "#52525B" : ok ? "#047857" : "#B45309";
  return (
    <span className="v2-tnum font-medium" style={{ color: c, fontSize: size }}>
      {z ? "0" : sgn(v, d)}
      {unit}
    </span>
  );
}

export function SpChip({
  children,
  tint = "#52525B",
  bg = "#F4F4F5",
  className = "",
}: {
  children: ReactNode;
  tint?: string;
  bg?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[26px] items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-[12.5px] font-medium v2-tnum ${className}`}
      style={{ color: tint, background: bg }}
    >
      {children}
    </span>
  );
}
