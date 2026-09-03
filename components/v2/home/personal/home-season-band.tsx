"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { appPath } from "@/lib/api-url";
import {
  addSeasonTask,
  buildSeasonMonths,
  deleteSeasonTask,
  moveSeasonTaskToMonth,
  moveSeasonTaskToPriority,
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
  type HomeSeasonPriority,
  type HomeSeasonTask,
} from "@/lib/v2/personal/seeds/home-seed";
import { HomeTaskCheckbox } from "@/components/v2/home/personal/home-task-checkbox";
import { V2Icons } from "@/components/v2/ui/icons";

const HERO_BLUE = "#2d5eef";

const PRIORITY_GROUPS: {
  id: HomeSeasonPriority;
  label: string;
  emoji: string;
  tint: string;
  bg: string;
  dot: string;
}[] = [
  { id: "high", label: "Высокий приоритет", emoji: "🔴", tint: "#B91C1C", bg: "#FEF2F2", dot: "#DC2626" },
  { id: "medium", label: "Средний приоритет", emoji: "🟡", tint: "#A16207", bg: "#FFFBEB", dot: "#EA580C" },
  { id: "low", label: "Необязательно, но желательно", emoji: "⚪", tint: "#52525B", bg: "#F4F4F5", dot: "#71717A" },
];

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

function TaskDocLinks({ task, done }: { task: HomeSeasonTask; done: boolean }) {
  const links =
    task.links?.length
      ? task.links
      : task.href
        ? [{ label: "Открыть документ", href: task.href }]
        : [];

  if (!links.length) return null;

  const btnClass = done
    ? "border border-white/35 bg-white/15 text-white hover:bg-white/25"
    : "border border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)] hover:border-[var(--v2-brand-400)]";

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex w-fit items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12.5px] font-semibold transition ${btnClass}`}
        >
          <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
          {link.label}
        </a>
      ))}
    </div>
  );
}

type TaskView = HomeSeasonTask & { done: boolean };

type MonthView = Omit<HomeMonth, "tasks"> & { tasks: TaskView[] };

type PriorityGroupKey = HomeSeasonPriority | "other";

type TaskGroupKey = PriorityGroupKey | "all";

type PriorityTaskGroup = {
  key: TaskGroupKey;
  label: string;
  emoji?: string;
  tint?: string;
  bg?: string;
  tasks: TaskView[];
};

function priorityRank(p?: HomeSeasonPriority): number {
  if (p === "high") return 0;
  if (p === "medium") return 1;
  if (p === "low") return 2;
  return 3;
}

function groupTasksByPriority(tasks: TaskView[]): PriorityTaskGroup[] {
  const sorted = [...tasks].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
  const groups: PriorityTaskGroup[] = PRIORITY_GROUPS.map((g) => ({
    key: g.id,
    label: g.label,
    emoji: g.emoji,
    tint: g.tint,
    bg: g.bg,
    tasks: sorted.filter((t) => t.priority === g.id),
  }));
  const other = sorted.filter((t) => !t.priority);
  if (other.length) groups.push({ key: "other", label: "Прочее", tasks: other });
  return groups;
}

function TaskBullets({ items, tone }: { items: string[]; tone: "default" | "on-blue" }) {
  return (
    <ul
      className={`v2-tight space-y-1.5 pl-4 text-[13.5px] leading-snug ${
        tone === "on-blue" ? "text-white/85 marker:text-white/50" : "text-[var(--v2-ink-600)] marker:text-[var(--v2-ink-300)]"
      } list-disc`}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SeasonTaskCard({
  task,
  expanded,
  onToggleExpand,
  onToggleDone,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  dragDisabled,
  isDragging,
}: {
  task: TaskView;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  dragDisabled: boolean;
  isDragging: boolean;
}) {
  const hasDetails =
    Boolean(task.note) ||
    Boolean(task.items?.length) ||
    Boolean(task.sections?.length) ||
    Boolean(task.exclude?.length) ||
    Boolean(task.doneWhen);
  const priorityMeta = PRIORITY_GROUPS.find((g) => g.id === task.priority);

  return (
    <div
      className="group relative"
      onDragOver={(e) => {
        if (!isDragging || dragDisabled) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className={`overflow-hidden rounded-2xl transition ${
          task.done
            ? "text-white shadow-[0_10px_26px_-14px_rgba(45,94,239,0.7)]"
            : "bg-[var(--v2-ink-50)] ring-1 ring-[var(--v2-ink-100)] hover:bg-white hover:shadow-[var(--v2-shadow-card)]"
        }`}
        style={task.done ? { background: HERO_BLUE } : undefined}
      >
        <div className="flex items-start gap-3 px-4 py-3.5 pr-16">
          <button
            type="button"
            draggable={!dragDisabled}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", task.id);
              onDragStart(e);
            }}
            onDragEnd={onDragEnd}
            onClick={onToggleDone}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing"
            aria-label={task.done ? "Отметить не сделанным" : "Отметить сделанным"}
          >
            <HomeTaskCheckbox done={task.done} tone={task.done ? "on-blue" : "default"} />
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={hasDetails ? onToggleExpand : onToggleDone}
              className={`v2-tight flex w-full items-start gap-2.5 text-left text-[16px] font-semibold leading-snug tracking-[-0.018em] ${
                task.done ? "text-white" : "text-[var(--v2-ink-900)]"
              }`}
            >
              {priorityMeta && !task.done ? (
                <span
                  className="mt-[7px] h-2 w-2 shrink-0 rounded-full"
                  style={{ background: priorityMeta.dot }}
                  aria-hidden
                />
              ) : null}
              <span className="min-w-0 flex-1">{task.text}</span>
            </button>
          </div>
          {hasDetails ? (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-label={expanded ? "Свернуть" : "Подробнее"}
              className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                task.done
                  ? "text-white/70 hover:bg-white/15 hover:text-white"
                  : "text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-700)]"
              }`}
            >
              <V2Icons.chev
                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          ) : null}
        </div>

        {expanded && hasDetails ? (
          <div
            className={`space-y-3 border-t px-4 py-3.5 ${
              task.done ? "border-white/15" : "border-[var(--v2-ink-100)] bg-white/60"
            }`}
          >
            {task.note ? (
              <p
                className={`v2-tight text-[13px] leading-relaxed ${
                  task.done ? "text-white/80" : "text-[var(--v2-ink-500)]"
                }`}
              >
                {task.note}
              </p>
            ) : null}
            {task.items?.length ? <TaskBullets items={task.items} tone={task.done ? "on-blue" : "default"} /> : null}
            {task.sections?.map((section) => (
              <div key={section.title ?? section.items[0]}>
                {section.title ? (
                  <p
                    className={`v2-tight mb-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                      task.done ? "text-white/60" : "text-[var(--v2-ink-400)]"
                    }`}
                  >
                    {section.title}
                  </p>
                ) : null}
                <TaskBullets items={section.items} tone={task.done ? "on-blue" : "default"} />
              </div>
            ))}
            {task.exclude?.length ? (
              <div
                className={`rounded-xl px-3 py-2.5 ${
                  task.done ? "bg-white/10" : "bg-[var(--v2-ink-50)] ring-1 ring-[var(--v2-ink-100)]"
                }`}
              >
                <p
                  className={`v2-tight mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide ${
                    task.done ? "text-white/55" : "text-[var(--v2-ink-400)]"
                  }`}
                >
                  Не входит
                </p>
                <TaskBullets items={task.exclude} tone={task.done ? "on-blue" : "default"} />
              </div>
            ) : null}
            {task.doneWhen ? (
              <p
                className={`v2-tight rounded-xl px-3 py-2.5 text-[13px] leading-snug ${
                  task.done
                    ? "bg-white/10 text-white/90"
                    : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
                }`}
              >
                <span className="font-semibold">Готово, когда: </span>
                {task.doneWhen}
              </p>
            ) : null}
            <TaskDocLinks task={task} done={task.done} />
          </div>
        ) : null}
      </div>
      <button
        type="button"
        title="Редактировать"
        aria-label="Редактировать карточку"
        onClick={onEdit}
        className={`absolute right-10 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
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
        onClick={onDelete}
        className={`absolute right-2 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition group-hover:opacity-100 focus:opacity-100 ${
          task.done
            ? "text-white/70 hover:bg-white/15 hover:text-white"
            : "text-[var(--v2-ink-400)] hover:bg-red-50 hover:text-red-500"
        }`}
      >
        <V2Icons.trash className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function PriorityPicker({
  value,
  onChange,
}: {
  value?: HomeSeasonPriority;
  onChange: (value?: HomeSeasonPriority) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="v2-tight text-[12px] font-semibold text-[var(--v2-ink-500)]">Приоритет</span>
      <div className="flex flex-wrap gap-2">
        {PRIORITY_GROUPS.map((g) => {
          const active = value === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onChange(active ? undefined : g.id)}
              className={`v2-tight inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-semibold transition ${
                active
                  ? "border-[var(--v2-brand-400)] bg-white text-[var(--v2-ink-900)] shadow-sm"
                  : "border-[var(--v2-ink-200)] bg-white/80 text-[var(--v2-ink-600)] hover:border-[var(--v2-ink-300)]"
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.dot }} aria-hidden />
              {g.id === "high" ? "Высокий" : g.id === "medium" ? "Средний" : "Желательно"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SeasonCardForm({
  draftText,
  draftNote,
  draftHref,
  draftPriority,
  showPriority,
  onTextChange,
  onNoteChange,
  onHrefChange,
  onPriorityChange,
  onSubmit,
  onCancel,
  submitLabel = "Сохранить",
  autoFocus = false,
}: {
  draftText: string;
  draftNote: string;
  draftHref: string;
  draftPriority?: HomeSeasonPriority;
  showPriority?: boolean;
  onTextChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onHrefChange: (value: string) => void;
  onPriorityChange?: (value?: HomeSeasonPriority) => void;
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
        placeholder="Заголовок карточки"
        autoFocus={autoFocus}
        className="v2-tight w-full rounded-xl border border-[var(--v2-ink-200)] bg-white px-3.5 py-2.5 text-[15px] text-[var(--v2-ink-900)] outline-none ring-[var(--v2-brand-500)] focus:ring-2"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <textarea
        value={draftNote}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Описание (необязательно)"
        rows={3}
        className="v2-tight w-full resize-y rounded-xl border border-[var(--v2-ink-200)] bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--v2-ink-900)] outline-none ring-[var(--v2-brand-500)] focus:ring-2"
        onKeyDown={(e) => {
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
      {showPriority && onPriorityChange ? (
        <PriorityPicker value={draftPriority} onChange={onPriorityChange} />
      ) : null}
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

export function HomeSeasonBand() {
  const currentId = useMemo(() => resolveCurrentSeasonMonthId(new Date()), []);
  const [storage, setStorage] = useState<SeasonStorageState>(() => readSeasonStorage());
  const [activeId, setActiveId] = useState(currentId);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dropMonthId, setDropMonthId] = useState<string | null>(null);
  const [dropPriorityKey, setDropPriorityKey] = useState<TaskGroupKey | null>(null);

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

  const onAdd = (monthId: string, input: { text: string; href?: string; note?: string; priority?: HomeSeasonPriority }) => {
    refreshStorage(addSeasonTask(monthId, input, HOME_MONTHS));
  };

  const onEdit = (taskId: string, input: { text: string; href?: string; note?: string; priority?: HomeSeasonPriority }) => {
    refreshStorage(updateSeasonTask(taskId, input, HOME_MONTHS));
  };

  const onDropToPriority = (monthId: string, taskId: string, priority: HomeSeasonPriority | undefined) => {
    refreshStorage(moveSeasonTaskToPriority(taskId, monthId, priority, HOME_MONTHS));
    setDragTaskId(null);
    setDropPriorityKey(null);
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
          Клик — сделано. Стрелка — детали. Перетащите на другой месяц или между приоритетами.
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
          setDropPriorityKey(null);
        }}
        dropPriorityKey={dropPriorityKey}
        onDropPriorityKeyChange={setDropPriorityKey}
        onToggle={onToggle}
        onDelete={onDelete}
        onAdd={onAdd}
        onEdit={onEdit}
        onDropToPriority={onDropToPriority}
      />
    </section>
  );
}

function MonthPanel({
  month,
  dragTaskId,
  dropPriorityKey,
  onDragStart,
  onDragEnd,
  onDropPriorityKeyChange,
  onToggle,
  onDelete,
  onAdd,
  onEdit,
  onDropToPriority,
}: {
  month: MonthView;
  dragTaskId: string | null;
  dropPriorityKey: TaskGroupKey | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropPriorityKeyChange: (key: TaskGroupKey | null) => void;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: (monthId: string, input: { text: string; href?: string; note?: string; priority?: HomeSeasonPriority }) => void;
  onEdit: (
    taskId: string,
    input: { text: string; href?: string; note?: string; priority?: HomeSeasonPriority }
  ) => void;
  onDropToPriority: (monthId: string, taskId: string, priority: HomeSeasonPriority | undefined) => void;
}) {
  const done = month.tasks.filter((t) => t.done).length;
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftHref, setDraftHref] = useState("");
  const [draftPriority, setDraftPriority] = useState<HomeSeasonPriority | undefined>(undefined);

  const usePriorityGroups = month.id === "sep";
  const taskGroups = useMemo((): PriorityTaskGroup[] => {
    if (!usePriorityGroups) return [{ key: "all", label: "", tasks: month.tasks }];
    const grouped = groupTasksByPriority(month.tasks);
    if (!dragTaskId) return grouped.filter((g) => g.tasks.length > 0);
    const byKey = new Map(grouped.map((g) => [g.key, g]));
    const result: PriorityTaskGroup[] = PRIORITY_GROUPS.map(
      (g) => byKey.get(g.id) ?? { key: g.id, label: g.label, emoji: g.emoji, tint: g.tint, bg: g.bg, tasks: [] }
    );
    if (!result.some((g) => g.key === "other")) {
      result.push(byKey.get("other") ?? { key: "other", label: "Прочее", tasks: [] });
    }
    return result;
  }, [month.tasks, usePriorityGroups, dragTaskId]);

  function resetDraft() {
    setAdding(false);
    setEditingId(null);
    setDraftText("");
    setDraftNote("");
    setDraftHref("");
    setDraftPriority(undefined);
  }

  useEffect(() => {
    resetDraft();
    setExpandedId(null);
  }, [month.id]);

  function startAdd() {
    setEditingId(null);
    setDraftText("");
    setDraftNote("");
    setDraftHref("");
    setDraftPriority(undefined);
    setAdding(true);
  }

  function startEdit(task: HomeSeasonTask) {
    setAdding(false);
    setEditingId(task.id);
    setDraftText(task.text);
    setDraftNote(task.note ?? "");
    setDraftHref(task.href ?? "");
    setDraftPriority(task.priority);
  }

  function submitAdd() {
    const text = draftText.trim();
    if (!text) return;
    onAdd(month.id, {
      text,
      note: draftNote.trim() || undefined,
      href: draftHref.trim() || undefined,
      ...(usePriorityGroups ? { priority: draftPriority } : {}),
    });
    resetDraft();
  }

  function submitEdit() {
    if (!editingId) return;
    const text = draftText.trim();
    if (!text) return;
    onEdit(editingId, {
      text,
      note: draftNote.trim() || undefined,
      href: draftHref.trim() || undefined,
      ...(usePriorityGroups ? { priority: draftPriority } : {}),
    });
    resetDraft();
  }

  const dragDisabled = Boolean(adding || editingId);

  return (
    <div className="mt-4 rounded-[20px] bg-white p-7 shadow-[var(--v2-shadow-card)]">
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

      {month.warn ? (
        <div className="mb-5">
          <p className="v2-tight whitespace-pre-wrap rounded-2xl bg-amber-50 px-5 py-[18px] text-[15px] font-medium leading-relaxed text-amber-900">
            {month.warn}
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        {taskGroups.map((group) => {
          const dropPriority =
            group.key === "high" || group.key === "medium" || group.key === "low" ? group.key : undefined;
          const isDropTarget = Boolean(dragTaskId && dropPriorityKey === group.key);

          return (
          <div
            key={group.key}
            onDragOver={(e) => {
              if (!dragTaskId || !usePriorityGroups) return;
              e.preventDefault();
              e.stopPropagation();
              onDropPriorityKeyChange(group.key);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                onDropPriorityKeyChange(null);
              }
            }}
            onDrop={(e) => {
              if (!dragTaskId || !usePriorityGroups) return;
              e.preventDefault();
              e.stopPropagation();
              onDropToPriority(month.id, dragTaskId, dropPriority);
              onDragEnd();
            }}
            className={`rounded-2xl transition ${
              isDropTarget ? "bg-[var(--v2-brand-50)] ring-2 ring-[var(--v2-brand-300)] ring-offset-2" : ""
            } ${dragTaskId && usePriorityGroups ? "min-h-[88px]" : ""}`}
          >
            {group.label ? (
              <div className="mb-3 flex items-center gap-2 px-0.5">
                {group.emoji ? <span className="text-[14px]">{group.emoji}</span> : null}
                <h4
                  className="v2-tight text-[13px] font-semibold uppercase tracking-[0.08em]"
                  style={group.tint ? { color: group.tint } : { color: "var(--v2-ink-500)" }}
                >
                  {group.label}
                </h4>
                <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{group.tasks.length}</span>
                {isDropTarget ? (
                  <span className="v2-tight ml-auto text-[11.5px] font-medium text-[var(--v2-brand-700)]">
                    Отпустите здесь
                  </span>
                ) : null}
              </div>
            ) : null}
            <div
              className="grid grid-cols-1 gap-3 p-0.5 md:grid-cols-2"
              onDragOver={(e) => {
                if (!dragTaskId || !usePriorityGroups) return;
                e.preventDefault();
                e.stopPropagation();
                onDropPriorityKeyChange(group.key);
              }}
            >
              {group.tasks.length ? (
                group.tasks.map((task) =>
                  editingId === task.id ? (
                    <SeasonCardForm
                      key={task.id}
                      draftText={draftText}
                      draftNote={draftNote}
                      draftHref={draftHref}
                      draftPriority={draftPriority}
                      showPriority={usePriorityGroups}
                      onTextChange={setDraftText}
                      onNoteChange={setDraftNote}
                      onHrefChange={setDraftHref}
                      onPriorityChange={setDraftPriority}
                      onSubmit={submitEdit}
                      onCancel={resetDraft}
                      submitLabel="Сохранить изменения"
                      autoFocus
                    />
                  ) : (
                    <SeasonTaskCard
                      key={task.id}
                      task={task}
                      expanded={expandedId === task.id}
                      onToggleExpand={() => setExpandedId((id) => (id === task.id ? null : task.id))}
                      onToggleDone={() => onToggle(task.id, !task.done)}
                      onEdit={() => startEdit(task)}
                      onDelete={() => onDelete(task.id)}
                      onDragStart={() => onDragStart(task.id)}
                      onDragEnd={onDragEnd}
                      dragDisabled={dragDisabled}
                      isDragging={Boolean(dragTaskId)}
                    />
                  )
                )
              ) : dragTaskId && usePriorityGroups ? (
                <div className="flex min-h-[72px] items-center justify-center rounded-2xl border-2 border-dashed border-[var(--v2-brand-200)] bg-[var(--v2-brand-50)]/40 px-4 py-6 text-center">
                  <span className="v2-tight text-[13px] font-medium text-[var(--v2-brand-700)]">
                    Перетащите карточку сюда
                  </span>
                </div>
              ) : null}
            </div>
          </div>
          );
        })}

        {adding ? (
          <SeasonCardForm
            draftText={draftText}
            draftNote={draftNote}
            draftHref={draftHref}
            draftPriority={draftPriority}
            showPriority={usePriorityGroups}
            onTextChange={setDraftText}
            onNoteChange={setDraftNote}
            onHrefChange={setDraftHref}
            onPriorityChange={setDraftPriority}
            onSubmit={submitAdd}
            onCancel={resetDraft}
            autoFocus
          />
        ) : !editingId ? (
          <button
            type="button"
            onClick={startAdd}
            className="flex min-h-[72px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--v2-ink-200)] bg-[var(--v2-ink-50)] px-[22px] py-4 text-[var(--v2-ink-500)] transition hover:border-[var(--v2-brand-300)] hover:bg-[var(--v2-brand-50)] hover:text-[var(--v2-brand-700)] md:max-w-sm"
          >
            <V2Icons.plus className="h-5 w-5" />
            <span className="v2-tight text-[14.5px] font-semibold">Добавить карточку</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
