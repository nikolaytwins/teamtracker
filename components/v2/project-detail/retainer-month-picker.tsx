"use client";

import { formatWorkMonthLabel } from "@/lib/v2/projects/retainer-utils";

export function RetainerMonthPicker({
  workMonth,
  availableMonths,
  onChange,
}: {
  workMonth: string;
  availableMonths: string[];
  onChange: (month: string) => void;
}) {
  const idx = availableMonths.indexOf(workMonth);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < availableMonths.length - 1;
  const currentMonth = availableMonths[availableMonths.length - 1];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[var(--v2-shadow-card)]">
      <span className="v2-tight text-[12px] font-medium text-[var(--v2-ink-500)]">Период</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onChange(availableMonths[idx - 1]!)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)] disabled:opacity-30"
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <select
          value={workMonth}
          onChange={(e) => onChange(e.target.value)}
          className="v2-tight min-w-[140px] rounded-lg border border-[var(--v2-ink-200)] bg-white px-2.5 py-1.5 text-[13px] font-medium text-[var(--v2-ink-900)] outline-none focus:border-[var(--v2-brand-400)]"
        >
          {[...availableMonths].reverse().map((m) => (
            <option key={m} value={m}>
              {formatWorkMonthLabel(m)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onChange(availableMonths[idx + 1]!)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--v2-ink-600)] transition hover:bg-[var(--v2-ink-50)] disabled:opacity-30"
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>
      {currentMonth && workMonth === currentMonth ? (
        <span className="v2-tight rounded-md bg-[var(--v2-brand-50)] px-2 py-0.5 text-[11px] font-medium text-[var(--v2-brand-700)]">
          Текущий месяц
        </span>
      ) : currentMonth ? (
        <button
          type="button"
          onClick={() => onChange(currentMonth)}
          className="v2-tight text-[11.5px] font-medium text-[var(--v2-brand-700)] hover:underline"
        >
          К текущему
        </button>
      ) : null}
    </div>
  );
}
