"use client";

import { fmtDuration, fmtTimer, formatDueLabel } from "@/lib/v2/format";
import type { V2TaskWithMeta } from "@/lib/v2/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { PriorityDot, ProjectChip, Ring, TimerButton } from "@/components/v2/ui/primitives";

type HeroMetricsProps = {
  completedToday: number;
  totalToday: number;
  focusSecToday: number;
  urgentCount: number;
  urgentOverdue: number;
  urgentToday: number;
  dayPct: number;
};

export function ActiveTrackerHero({
  task,
  elapsed,
  running,
  onToggleTimer,
  onStop,
  completedToday,
  totalToday,
  focusSecToday,
  urgentCount,
  urgentOverdue,
  urgentToday,
}: {
  task: V2TaskWithMeta | null;
  elapsed: number;
  running: boolean;
  onToggleTimer: () => void;
  onStop: () => void;
  completedToday: number;
  totalToday: number;
  focusSecToday: number;
  urgentCount: number;
  urgentOverdue: number;
  urgentToday: number;
}) {
  const dayPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const metrics = {
    completedToday,
    totalToday,
    focusSecToday,
    urgentCount,
    urgentOverdue,
    urgentToday,
    dayPct,
  };

  if (!task) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-soft)]">
        <HeroBackground />
        <div className="relative grid grid-cols-12 gap-8 p-7">
          <div className="col-span-12 lg:col-span-7">
            <p className="text-[14px] text-[var(--v2-ink-500)]">Нет активного таймера. Запустите задачу из списка ниже.</p>
          </div>
          <HeroMetrics {...metrics} />
        </div>
      </div>
    );
  }

  const totalOnTask = task.logged_seconds + (running ? elapsed : 0);
  const est = task.estimate_seconds ?? 0;
  const estRemain = est > 0 ? Math.max(est - totalOnTask, 0) : 0;
  const pctOnTask = est > 0 ? Math.min(totalOnTask / est, 1) : 0;
  const dueLabel = formatDueLabel(task.deadline_at, task.bucket);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-soft)]">
      <HeroBackground />
      <div className="relative grid grid-cols-12 gap-8 p-7">
        <div className="col-span-12 flex flex-col lg:col-span-7">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
            {running ? (
              <span className="v2-livedot relative inline-flex h-2 w-2 rounded-full bg-[var(--v2-brand-500)] text-[var(--v2-brand-500)]" />
            ) : (
              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--v2-ink-300)]" />
            )}
            <span>{running ? "в фокусе сейчас" : "активная задача"}</span>
            <span className="ml-1 text-[var(--v2-ink-300)]">·</span>
            <span className="font-medium normal-case tracking-normal text-[var(--v2-ink-500)]">{dueLabel}</span>
          </div>

          <h2 className="v2-tighter mt-3 max-w-[34ch] text-[26px] font-semibold leading-[1.15] text-[var(--v2-ink-900)]">
            {task.title}
          </h2>

          <div className="mt-3 flex items-center gap-2">
            {task.project_name ? (
              <ProjectChip
                name={task.project_name}
                short={task.project_short_name}
                bg={task.project_color_bg}
                tint={task.project_color_tint}
              />
            ) : null}
            <PriorityDot priority={task.priority} />
          </div>

          <div className="mt-7 flex items-end gap-6">
            <div className="leading-none">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-500)]">
                Текущая сессия
              </div>
              <div className="v2-tnum font-mono text-[64px] leading-none tracking-[-0.04em] text-[var(--v2-ink-900)]">
                {fmtTimer(elapsed)}
              </div>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <TimerButton running={running} onClick={onToggleTimer} size="lg" />
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--v2-ink-600)] shadow-[var(--v2-shadow-card)] transition hover:text-[var(--v2-ink-900)] hover:shadow-[var(--v2-shadow-cardHv)]"
                title="Остановить и сохранить"
              >
                <V2Icons.stop className="h-[14px] w-[14px]" />
              </button>
            </div>
          </div>

          {est > 0 ? (
            <div className="mt-7 max-w-[520px]">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="text-[var(--v2-ink-500)]">На задачу всего</span>
                <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">
                  {fmtDuration(totalOnTask)} <span className="text-[var(--v2-ink-400)]">/ {fmtDuration(est)}</span>
                </span>
              </div>
              <div className="h-[6px] overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--v2-brand-500)] to-[var(--v2-brand-600)]"
                  style={{ width: `${Math.round(pctOnTask * 100)}%`, transition: "width .9s cubic-bezier(.2,.7,.2,1)" }}
                />
              </div>
              <div className="mt-2 text-[11.5px] text-[var(--v2-ink-500)]">
                Осталось примерно <span className="font-medium text-[var(--v2-ink-700)]">{fmtDuration(estRemain)}</span> ·
                дедлайн {dueLabel}
              </div>
            </div>
          ) : null}
        </div>

        <HeroMetrics {...metrics} />
      </div>
    </div>
  );
}


function HeroBackground() {
  return (
    <>
      <div className="v2-dotgrid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[var(--v2-brand-500)]/10 blur-3xl" />
    </>
  );
}


function HeroMetrics({
  completedToday,
  totalToday,
  focusSecToday,
  urgentCount,
  urgentOverdue,
  urgentToday,
  dayPct,
}: HeroMetricsProps) {
  return (
    <div className="col-span-12 flex flex-col gap-4 lg:col-span-5">
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[var(--v2-brand-50)]/80 to-white p-5 shadow-[var(--v2-shadow-card)]">
        <Ring
          value={completedToday}
          total={totalToday || undefined}
          label="День"
          sub={totalToday > 0 ? `${dayPct}% задач выполнено` : "нет задач на сегодня"}
        />
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Часов в фокусе</div>
          <div className="v2-tighter v2-tnum mt-1 font-mono text-[28px] leading-none text-[var(--v2-ink-900)]">{fmtDuration(focusSecToday)}</div>
          <div className="mt-1 text-[11.5px] text-[var(--v2-ink-500)]">сегодня</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Срочно
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="v2-tighter v2-tnum text-[28px] font-semibold leading-none text-[var(--v2-ink-900)]">{urgentCount}</div>
            <div className="text-[11.5px] text-[var(--v2-ink-500)]">задач</div>
          </div>
          <div className="mt-3 text-[11.5px] text-[var(--v2-ink-500)]">
            {urgentOverdue} просрочены · {urgentToday} — сегодня
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)]">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">
            <V2Icons.spark className="h-3.5 w-3.5 text-[var(--v2-brand-500)]" />
            Серия
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div className="v2-tighter v2-tnum text-[28px] font-semibold leading-none text-[var(--v2-ink-900)]">—</div>
            <div className="text-[11.5px] text-[var(--v2-ink-500)]">дней</div>
          </div>
          <div className="mt-3 text-[11.5px] text-[var(--v2-ink-500)]">скоро</div>
        </div>
      </div>
    </div>
  );
}

