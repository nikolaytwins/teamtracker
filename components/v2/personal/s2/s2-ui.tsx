"use client";

import type { ReactNode } from "react";

export function S2Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="v2-tight text-[18px] font-bold text-[var(--v2-ink-900)]">{title}</h2>
          {hint ? <p className="mt-0.5 text-[13px] text-[var(--v2-ink-500)]">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function S2Chip({
  children,
  tone = "ink",
}: {
  children: ReactNode;
  tone?: "ink" | "brand" | "amber" | "red" | "green";
}) {
  const cls = {
    ink: "bg-[var(--v2-ink-50)] text-[var(--v2-ink-700)]",
    brand: "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]",
    amber: "bg-amber-50 text-amber-900",
    red: "bg-red-50 text-red-700",
    green: "bg-emerald-50 text-emerald-800",
  }[tone];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

export function S2Btn({
  children,
  onClick,
  kind = "ghost",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "ghost" | "solid" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    kind === "solid"
      ? "bg-[var(--v2-ink-900)] text-white hover:bg-[var(--v2-ink-800)]"
      : kind === "danger"
        ? "text-red-600 hover:bg-red-50"
        : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 items-center rounded-lg px-3 text-[12.5px] font-semibold transition disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

export function S2Overlay({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="v2-tight text-[17px] font-bold text-[var(--v2-ink-900)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold text-[var(--v2-ink-400)] hover:text-[var(--v2-ink-800)]"
          >
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function S2Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-[12px] font-medium text-[var(--v2-ink-600)]">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const s2Input =
  "v2-input h-10 w-full text-[14px]";
export const s2Area =
  "v2-input min-h-[88px] w-full py-2 text-[14px] leading-relaxed";
