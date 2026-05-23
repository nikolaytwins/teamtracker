"use client";

import { fmtDuration, fmtTimer, formatDueLabel } from "@/lib/v2/format";
import { pickSuggestedTask } from "@/lib/v2/tasks/suggest-task";
import type { V2TaskWithMeta } from "@/lib/v2/types";
import { V2Icons } from "@/components/v2/ui/icons";
import { PriorityDot, ProjectChip, Ring, TimerButton } from "@/components/v2/ui/primitives";
import { useEffect, useMemo, useRef, useState } from "react";

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
  onStartSuggested,
  candidateTasks,
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
  onStartSuggested?: (taskId: string) => void;
  candidateTasks?: V2TaskWithMeta[];
  completedToday: number;
  totalToday: number;
  focusSecToday: number;
  urgentCount: number;
  urgentOverdue: number;
  urgentToday: number;
}) {
  const dayPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
  const metrics: HeroMetricsProps = {
    completedToday,
    totalToday,
    focusSecToday,
    urgentCount,
    urgentOverdue,
    urgentToday,
    dayPct,
  };

  if (!task) {
    return <IdleHero metrics={metrics} candidates={candidateTasks ?? []} onStart={onStartSuggested} />;
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
                ink={task.project_color_ink}
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

function IdleHero({
  metrics,
  candidates,
  onStart,
}: {
  metrics: HeroMetricsProps;
  candidates: V2TaskWithMeta[];
  onStart?: (taskId: string) => void;
}) {
  const autoPick = useMemo(() => pickSuggestedTask(candidates), [candidates]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedId(null);
  }, [autoPick?.id]);

  const selected = useMemo(() => {
    if (selectedId) return candidates.find((t) => t.id === selectedId) ?? autoPick;
    return autoPick;
  }, [selectedId, candidates, autoPick]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white shadow-[var(--v2-shadow-soft)]">
      <HeroBackground />
      <div className="relative grid grid-cols-12 gap-8 p-7">
        <div className="col-span-12 flex flex-col lg:col-span-7">
          {selected ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-brand-600)]">
                Чем займёмся?
              </div>
              <h2 className="v2-tighter mt-3 max-w-[38ch] text-[26px] font-semibold leading-[1.15] text-[var(--v2-ink-900)]">
                {selected.title}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2 shadow-[var(--v2-shadow-card)] transition hover:shadow-[var(--v2-shadow-cardHv)]"
                  >
                    {selected.project_name ? (
                      <ProjectChip
                        name={selected.project_name}
                        short={selected.project_short_name}
                        bg={selected.project_color_bg}
                        tint={selected.project_color_tint}
                        ink={selected.project_color_ink}
                        size="sm"
                      />
                    ) : (
                      <span className="px-2 text-[12px] text-[var(--v2-ink-600)]">Без проекта</span>
                    )}
                    <V2Icons.chev className="h-4 w-4 text-[var(--v2-ink-400)]" />
                  </button>
                  {menuOpen && candidates.length > 1 ? (
                    <div className="absolute left-0 top-full z-20 mt-2 max-h-[280px] min-w-[300px] overflow-y-auto rounded-xl border border-[var(--v2-ink-100)] bg-white py-1 shadow-[var(--v2-shadow-pop)]">
                      {candidates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(t.id);
                            setMenuOpen(false);
                          }}
                          className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition hover:bg-[var(--v2-ink-50)] ${
                            t.id === selected.id ? "bg-[var(--v2-brand-50)]/60" : ""
                          }`}
                        >
                          <span className="v2-tight text-[13px] font-medium text-[var(--v2-ink-900)]">{t.title}</span>
                          <span className="text-[11px] text-[var(--v2-ink-500)]">
                            {t.project_name ?? "Без проекта"} · {formatDueLabel(t.deadline_at, t.bucket)}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <PriorityDot priority={selected.priority} />
              </div>
              <div className="mt-8 flex items-center gap-3">
                <TimerButton running={false} onClick={() => onStart?.(selected.id)} size="lg" />
                <span className="text-[13px] text-[var(--v2-ink-500)]">Запустить таймер на этой задаче</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--v2-ink-400)]">Таймер</div>
              <p className="mt-3 max-w-[40ch] text-[15px] leading-relaxed text-[var(--v2-ink-500)]">
                Открытых задач пока нет. Создайте задачу и привяжите к проекту — она появится здесь.
              </p>
            </>
          )}
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
    </div>
  );
}
