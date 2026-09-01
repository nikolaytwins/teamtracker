"use client";

/** Прежний плоский дизайн карточек сезона. Откат: в v2-personal-home-client импортировать HomeSeasonBandLegacy. */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { appPath } from "@/lib/api-url";
import {
  addSeasonTask,
  buildSeasonMonths,
  deleteSeasonTask,
  moveSeasonTaskToMonth,
  readSeasonStorage,
  toggleSeasonTaskDone,
  updateSeasonTask,
  type SeasonStorageState,
} from "@/lib/v2/home/home-season-storage";
import {
  HOME_LINKS,
  HOME_MONTHS,
  resolveCurrentSeasonMonthId,
  type HomeMonth,
  type HomeSeasonTask,
} from "@/lib/v2/personal/seeds/home-seed";
import { HomeTaskCheckbox } from "@/components/v2/home/personal/home-task-checkbox";
import { V2Icons } from "@/components/v2/ui/icons";

const HERO_BLUE = "#2d5eef";

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M14 3h7v7M10 14 20 4M15 3h5v5M5 12v7h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TaskLabel({ task, done }: { task: HomeSeasonTask; done: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-2.5">
      <span
        className={`v2-tight text-[17.5px] font-semibold leading-snug tracking-[-0.018em] ${
          done ? "text-white" : "text-[var(--v2-ink-800)]"
        }`}
      >
        {task.text}
      </span>
      {task.href ? (
        <a
          href={task.href}
          target="_blank"
          rel="noopener noreferrer"
          title="Открыть в Google Docs"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={`inline-flex w-fit items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[13px] font-semibold shadow-sm transition ${
            done
              ? "border border-white/35 bg-white/15 text-white hover:bg-white/25"
              : "border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)] hover:border-[var(--v2-brand-400)] hover:bg-[var(--v2-brand-100)]"
          }`}
        >
          <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
          Открыть документ
        </a>
      ) : null}
    </span>
  );
}

type MonthView = Omit<HomeMonth, "tasks"> & { tasks: Array<HomeSeasonTask & { done: boolean }> };

function SeasonCardForm({
  draftText,
  draftHref,
  onTextChange,
  onHrefChange,
  onSubmit,
  onCancel,
  submitLabel = "Сохранить",
  autoFocus = false,
}: {
  draftText: string;
  draftHref: string;
  onTextChange: (value: string) => void;
  onHrefChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex min-h-[92px] flex-col gap-3 rounded-2xl border-2 border-dashed border-[var(--v2-brand-300)] bg-[var(--v2-brand-50)] px-[22px] py-5">
      <input
        type="text"
        value={draftText}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Текст карточки"
        autoFocus={autoFocus}
        className="v2-tight w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--v2-ink-900)] outline-none ring-[var(--v2-brand-500)] focus:ring-2"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <input
        type="url"
        value={draftHref}
        onChange={(e) => onHrefChange(e.target.value)}
        placeholder="Ссылка на документ (необязательно)"
        className="v2-tight w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3.5 py-2.5 text-[14px] text-[var(--v2-ink-900)] outline-none ring-[var(--v2-brand-500)] focus:ring-2"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!draftText.trim()}
          className="v2-tight rounded-xl bg-[var(--v2-brand-600)] px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-[var(--v2-brand-700)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="v2-tight rounded-xl px-4 py-2 text-[13.5px] font-semibold text-[var(--v2-ink-500)] transition hover:bg-[var(--v2-ink-100)]"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}

export function HomeSeasonBandLegacy() {
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

  const onDelete = (taskId: string) => {
    refreshStorage(deleteSeasonTask(taskId));
  };

  const onAdd = (monthId: string, input: { text: string; href?: string }) => {
    refreshStorage(addSeasonTask(monthId, input));
  };

  const onEdit = (taskId: string, input: { text: string; href?: string }) => {
    refreshStorage(updateSeasonTask(taskId, input));
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
        onDelete={onDelete}
        onAdd={onAdd}
        onEdit={onEdit}
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
  onDelete,
  onAdd,
  onEdit,
  onDropToMonth,
}: {
  month: MonthView;
  dragTaskId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (monthId: string, input: { text: string; href?: string }) => void;
  onEdit: (taskId: string, input: { text: string; href?: string }) => void;
  onDropToMonth: (monthId: string) => void;
}) {
  const done = month.tasks.filter((t) => t.done).length;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftHref, setDraftHref] = useState("");

  function resetDraft() {
    setAdding(false);
    setEditingId(null);
    setDraftText("");
    setDraftHref("");
  }

  useEffect(() => {
    resetDraft();
  }, [month.id]);

  function startAdd() {
    setEditingId(null);
    setDraftText("");
    setDraftHref("");
    setAdding(true);
  }

  function startEdit(task: HomeSeasonTask) {
    setAdding(false);
    setEditingId(task.id);
    setDraftText(task.text);
    setDraftHref(task.href ?? "");
  }

  function submitAdd() {
    const text = draftText.trim();
    if (!text) return;
    onAdd(month.id, { text, href: draftHref.trim() || undefined });
    resetDraft();
  }

  function submitEdit() {
    if (!editingId) return;
    const text = draftText.trim();
    if (!text) return;
    onEdit(editingId, { text, href: draftHref.trim() || undefined });
    resetDraft();
  }

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
        {!adding && !editingId ? (
          <button
            type="button"
            onClick={startAdd}
            className="v2-tight inline-flex items-center gap-1.5 rounded-xl border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] px-3.5 py-2 text-[13.5px] font-semibold text-[var(--v2-brand-700)] transition hover:border-[var(--v2-brand-400)] hover:bg-[var(--v2-brand-100)]"
          >
            <V2Icons.plus className="h-3.5 w-3.5" />
            Добавить карточку
          </button>
        ) : null}
      </div>

      {month.lead ? (
        <p className="v2-tight -mt-2 mb-5 max-w-[80ch] text-[15.5px] leading-relaxed text-[var(--v2-ink-500)]">
          {month.lead}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        {month.tasks.map((task) =>
          editingId === task.id ? (
            <SeasonCardForm
              key={task.id}
              draftText={draftText}
              draftHref={draftHref}
              onTextChange={setDraftText}
              onHrefChange={setDraftHref}
              onSubmit={submitEdit}
              onCancel={resetDraft}
              submitLabel="Сохранить изменения"
              autoFocus
            />
          ) : (
            <div key={task.id} className="group relative">
              <button
                type="button"
                draggable={!adding && !editingId}
                onDragStart={() => onDragStart(task.id)}
                onDragEnd={onDragEnd}
                onClick={() => onToggle(task.id, !task.done)}
                className={`flex min-h-[92px] w-full cursor-grab items-start gap-4 rounded-2xl px-[22px] py-5 pr-[4.5rem] text-left transition active:cursor-grabbing ${
                  task.done
                    ? "text-white shadow-[0_10px_26px_-14px_rgba(45,94,239,0.7)]"
                    : "bg-[var(--v2-ink-50)] hover:bg-[var(--v2-ink-100)]"
                }`}
                style={task.done ? { background: HERO_BLUE } : undefined}
              >
                <HomeTaskCheckbox done={task.done} tone={task.done ? "on-blue" : "default"} />
                <TaskLabel task={task} done={task.done} />
              </button>
              <button
                type="button"
                title="Редактировать"
                aria-label="Редактировать карточку"
                onClick={() => startEdit(task)}
                className={`absolute right-10 top-2 flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
                  task.done
                    ? "text-white/70 hover:bg-white/15 hover:text-white"
                    : "text-[var(--v2-ink-400)] hover:bg-[var(--v2-brand-50)] hover:text-[var(--v2-brand-700)]"
                }`}
              >
                <V2Icons.edit className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                title="Удалить"
                aria-label="Удалить задачу"
                onClick={() => onDelete(task.id)}
                className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
                  task.done
                    ? "text-white/70 hover:bg-white/15 hover:text-white"
                    : "text-[var(--v2-ink-400)] hover:bg-red-50 hover:text-red-500"
                }`}
              >
                <V2Icons.trash className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        )}
        {adding ? (
          <SeasonCardForm
            draftText={draftText}
            draftHref={draftHref}
            onTextChange={setDraftText}
            onHrefChange={setDraftHref}
            onSubmit={submitAdd}
            onCancel={resetDraft}
            autoFocus
          />
        ) : !editingId ? (
          <button
            type="button"
            onClick={startAdd}
            className="flex min-h-[92px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-[22px] py-5 text-[var(--v2-ink-500)] transition hover:border-[var(--v2-brand-300)] hover:bg-[var(--v2-brand-50)] hover:text-[var(--v2-brand-700)]"
          >
            <V2Icons.plus className="h-5 w-5" />
            <span className="v2-tight text-[14.5px] font-semibold">Добавить карточку</span>
          </button>
        ) : null}
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
