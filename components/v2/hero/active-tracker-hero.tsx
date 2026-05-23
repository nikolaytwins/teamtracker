"use client";

import { fmtDuration, fmtTimer } from "@/lib/v2/format";
import type { V2TaskWithMeta } from "@/lib/v2/types";
import { ProjectChip, TimerButton } from "@/components/v2/ui/primitives";
import { PRIORITY_META } from "@/components/v2/ui/icons";

export function ActiveTrackerHero({
  task,
  elapsed,
  onToggleTimer,
  onStop,
}: {
  task: V2TaskWithMeta;
  elapsed: number;
  onToggleTimer: () => void;
  onStop: () => void;
}) {
  const total = task.logged_seconds + elapsed;
  const est = task.estimate_seconds ?? 0;
  const pct = est > 0 ? Math.min(total / est, 1) : 0;
  const priority = PRIORITY_META[task.priority];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-soft)]">
      <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-70" />
      <div className="relative grid grid-cols-12 gap-8 p-7">
        <div className="col-span-12 lg:col-span-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--v2-brand-500)]">
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--v2-brand-500)] opacity-75" />
            </span>
            в фокусе сейчас
          </div>
          <h2 className="mt-3 max-w-[34ch] text-[26px] font-semibold leading-[1.15] tracking-[-0.034em]">{task.title}</h2>
          <div className="mt-3 flex items-center gap-2">
            {task.project_name && (
              <ProjectChip
                name={task.project_name}
                short={task.project_short_name}
                bg={task.project_color_bg}
                tint={task.project_color_tint}
              />
            )}
            <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--v2-ink-600)]">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: priority.dot }} />
              {priority.label}
            </span>
          </div>
          <div className="mt-7 flex items-end gap-6">
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-500)]">
                Текущая сессия
              </div>
              <div className="font-mono text-[56px] leading-none tracking-[-0.04em] tabular-nums">{fmtTimer(elapsed)}</div>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <TimerButton running onClick={onToggleTimer} size="lg" />
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[var(--v2-shadow-card)]"
                title="Остановить"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            </div>
          </div>
          {est > 0 && (
            <div className="mt-7 max-w-lg">
              <div className="mb-2 flex justify-between text-[12px]">
                <span className="text-[var(--v2-ink-500)]">На задачу всего</span>
                <span className="tabular-nums">
                  {fmtDuration(total)} / {fmtDuration(est)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--v2-brand-500)] to-[var(--v2-brand-600)] transition-all"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
