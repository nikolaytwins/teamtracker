"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { appPath } from "@/lib/api-url";
import {
  buildSeasonMonths,
  moveSeasonTaskToMonth,
  readSeasonStorage,
  toggleSeasonTaskDone,
  type SeasonStorageState,
} from "@/lib/v2/home/home-season-storage";
import {
  HOME_LINKS,
  HOME_MONTHS,
  resolveCurrentSeasonMonthId,
  type HomeMonth,
  type HomeSeasonTask,
} from "@/lib/v2/personal/seeds/home-seed";

const HERO_BLUE = "#2d5eef";

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14 5h5v5M10 14 19 5M15 5h4v4M19 19H5V5h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TaskLabel({ task, done }: { task: HomeSeasonTask; done: boolean }) {
  return (
    <span className="inline-flex min-w-0 flex-1 items-start gap-2">
      <span className="v2-tight min-w-0 text-[17.5px] font-semibold leading-snug tracking-[-0.018em]">{task.text}</span>
      {task.href ? (
        <a
          href={task.href}
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть документ"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
            done
              ? "text-white/70 hover:bg-white/15 hover:text-white"
              : "text-[var(--v2-ink-400)] hover:bg-white hover:text-[var(--v2-brand-600)]"
          }`}
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </span>
  );
}

type MonthView = Omit<HomeMonth, "tasks"> & { tasks: Array<HomeSeasonTask & { done: boolean }> };

export function HomeSeasonBand() {
  const currentId = useMemo(() => resolveCurrentSeasonMonthId(new Date()), []);
  const [storage, setStorage] = useState<SeasonStorageState>(() => readSeasonStorage());
  const [activeId, setActiveId] = useState(currentId);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropMonthId, setDropMonthId] = useState<string | null>(null);

  const months: MonthView[] = useMemo(() => buildSeasonMonths(HOME_MONTHS, storage), [storage]);
  const active = months.find((m) => m.id === activeId) ?? months[0]!;

  useEffect(() => {
    setActiveId(currentId);
  }, [currentId]);

  const refreshStorage = useCallback((next: SeasonStorageState) => {
    setStorage(next);
  }, []);

  const onToggle = (taskId: string, done: boolean) => {
    refreshStorage(toggleSeasonTaskDone(taskId, done));
  };

  const onDropToMonth = (monthId: string) => {
    if (!dragTaskId) return;
    refreshStorage(moveSeasonTaskToMonth(dragTaskId, monthId, HOME_MONTHS, true));
    setActiveId(monthId);
    setDragTaskId(null);
    setDropMonthId(null);
  };

  return (
    <section>
      <div className="mb-[18px] flex flex-wrap items-baseline gap-3.5">
        <h2 className="v2-tight text-[24px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">
          Расписание сезона
        </h2>
        <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">
          Четыре периода до Review 30 ноября. Клик — отметить сделанное. Перетащите задачу на другой месяц.
        </span>
        <Link
          href={appPath(HOME_LINKS.strategy)}
          className="v2-tight ml-auto text-[14px] font-medium text-[var(--v2-brand-700)] hover:text-[var(--v2-brand-600)]"
        >
          Стратегия →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {months.map((m) => {
          const done = m.tasks.filter((t) => t.done).length;
          const isActive = m.id === activeId;
          const isDrop = dropMonthId === m.id && dragTaskId;
          const isNow = m.id === currentId;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              onDragOver={(e) => {
                if (!dragTaskId) return;
                e.preventDefault();
                setDropMonthId(m.id);
              }}
              onDragLeave={() => {
                if (dropMonthId === m.id) setDropMonthId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDropToMonth(m.id);
              }}
              className={`flex flex-col rounded-[18px] p-5 text-left transition ${
                isActive
                  ? "shadow-[0_0_0_2.5px_var(--v2-brand-600),var(--v2-shadow-soft)]"
                  : "bg-white shadow-[var(--v2-shadow-card)] hover:-translate-y-px hover:shadow-[var(--v2-shadow-soft)]"
              } ${isDrop ? "ring-2 ring-[var(--v2-brand-400)] ring-offset-2" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[11.5px] font-semibold uppercase tracking-[0.14em] ${
                    isActive ? "text-[var(--v2-brand-600)]" : "text-[var(--v2-ink-400)]"
                  }`}
                >
                  {m.tag}
                </span>
                {isNow ? (
                  <span className="ml-auto rounded-[7px] bg-[var(--v2-brand-600)] px-2 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white">
                    сейчас
                  </span>
                ) : null}
              </div>
              <div className="v2-tight mt-2.5 text-[22px] font-semibold tracking-[-0.028em] text-[var(--v2-ink-900)]">
                {m.label}
              </div>
              <div className="v2-tight mt-1 text-[14.5px] leading-snug text-[var(--v2-ink-500)]">{m.headline}</div>
              <div className="mt-4 flex items-center gap-2.5">
                <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-[var(--v2-ink-100)]">
                  <span
                    className="block h-full rounded-full bg-[var(--v2-brand-600)] transition-all"
                    style={{ width: m.tasks.length ? `${(done / m.tasks.length) * 100}%` : "0%" }}
                  />
                </div>
                <span className="v2-tnum text-[13px] font-semibold text-[var(--v2-ink-500)]">
                  {done} / {m.tasks.length}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <MonthPanel
        month={active}
        dragTaskId={dragTaskId}
        onDragStart={setDragTaskId}
        onDragEnd={() => {
          setDragTaskId(null);
          setDropMonthId(null);
        }}
        onToggle={onToggle}
        onDropToMonth={onDropToMonth}
      />
    </section>
  );
}

function MonthPanel({
  month,
  dragTaskId,
  onDragStart,
  onDragEnd,
  onToggle,
  onDropToMonth,
}: {
  month: MonthView;
  dragTaskId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onToggle: (id: string, done: boolean) => void;
  onDropToMonth: (monthId: string) => void;
}) {
  const done = month.tasks.filter((t) => t.done).length;

  return (
    <div
      className="mt-4 rounded-[20px] bg-white p-7 shadow-[var(--v2-shadow-card)]"
      onDragOver={(e) => {
        if (!dragTaskId) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropToMonth(month.id);
      }}
    >
      <div className="mb-5 flex flex-wrap items-baseline gap-3.5">
        <h3 className="v2-tight text-[26px] font-semibold tracking-[-0.03em] text-[var(--v2-ink-900)]">
          {month.headline}
        </h3>
        <span className="v2-tight text-[14.5px] text-[var(--v2-ink-500)]">
          {month.label} · {month.tag}
        </span>
        <span className="v2-tnum v2-tight ml-auto text-[14px] font-semibold text-[var(--v2-ink-500)]">
          {done} из {month.tasks.length} сделано
        </span>
      </div>

      {month.lead ? (
        <p className="v2-tight -mt-2 mb-5 max-w-[80ch] text-[15.5px] leading-relaxed text-[var(--v2-ink-500)]">
          {month.lead}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {month.tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            draggable
            onDragStart={() => onDragStart(task.id)}
            onDragEnd={onDragEnd}
            onClick={() => onToggle(task.id, !task.done)}
            className={`flex min-h-[92px] cursor-grab items-center gap-4 rounded-2xl px-[22px] py-5 text-left transition active:cursor-grabbing ${
              task.done
                ? "text-white shadow-[0_10px_26px_-14px_rgba(45,94,239,0.7)]"
                : "bg-[var(--v2-ink-50)] hover:bg-[var(--v2-ink-100)]"
            }`}
            style={task.done ? { background: HERO_BLUE } : undefined}
          >
            <span
              className={`inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 text-[15px] ${
                task.done
                  ? "border-white bg-white font-bold text-[var(--v2-brand-600)]"
                  : "border-[var(--v2-ink-300)] bg-white text-transparent"
              }`}
            >
              ✓
            </span>
            <TaskLabel task={task} done={task.done} />
          </button>
        ))}
      </div>

      {month.warn ? (
        <div className="mt-[18px]">
          <p className="v2-tight whitespace-pre-wrap rounded-2xl bg-amber-50 px-5 py-[18px] text-[15px] font-medium leading-relaxed text-amber-900">
            {month.warn}
          </p>
        </div>
      ) : null}
    </div>
  );
}
