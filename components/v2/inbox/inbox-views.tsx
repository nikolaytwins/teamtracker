"use client";

import { InboxTaskCard } from "@/components/v2/inbox/inbox-task-card";
import {
  flattenInboxBuckets,
  INBOX_BUCKETS,
  isBurningProject,
  projectForTask,
  sortInboxTasks,
} from "@/components/v2/inbox/inbox-meta";
import { HEALTH_META, PRIORITY_META } from "@/components/v2/projects/portfolio-meta";
import { V2Icons } from "@/components/v2/ui/icons";
import type { PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import type { InboxViewMode } from "@/lib/v2/inbox/inbox-storage";
import type { V2InboxBucket, V2TaskWithMeta } from "@/lib/v2/types";
import { useMemo } from "react";

export function InboxViewSwitcher({
  view,
  setView,
}: {
  view: InboxViewMode;
  setView: (v: InboxViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-xl bg-white p-1 shadow-[var(--v2-shadow-card)]">
      {(
        [
          ["day", "День", V2Icons.list],
          ["week", "Неделя", V2Icons.cal],
          ["kanban", "Канбан", V2Icons.kanban],
        ] as const
      ).map(([id, label, Icon]) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition ${
              active ? "bg-[var(--v2-ink-900)] text-white" : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function InboxHighlightLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[var(--v2-ink-500)]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_META.critical.dot }} />
        Горящий проект
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: HEALTH_META.at_risk.dot }} />
        Под угрозой
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_META.urgent.dot }} />
        Срочный проект
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: PRIORITY_META.high.dot }} />
        Высокий приоритет проекта
      </span>
    </div>
  );
}

type InboxDndProps = {
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: (bucket: V2InboxBucket) => void;
  onPromote: (taskId: string) => void;
};

function useSortedAll(
  buckets: Record<V2InboxBucket, V2TaskWithMeta[]>,
  projectsById: Map<string, PortfolioProject>
) {
  return useMemo(
    () => sortInboxTasks(flattenInboxBuckets(buckets), projectsById),
    [buckets, projectsById]
  );
}

export function InboxDayView({
  buckets,
  projectsById,
  onPromote,
}: {
  buckets: Record<V2InboxBucket, V2TaskWithMeta[]>;
  projectsById: Map<string, PortfolioProject>;
  onPromote: (taskId: string) => void;
}) {
  const tasks = useSortedAll(buckets, projectsById);
  const burning = tasks.filter((t) => {
    const p = projectForTask(t, projectsById);
    return p && isBurningProject(p.health);
  });
  const priority = tasks.filter((t) => {
    const p = projectForTask(t, projectsById);
    return p && !isBurningProject(p.health);
  });
  const rest = tasks.filter((t) => !burning.includes(t) && !priority.includes(t));

  if (tasks.length === 0) {
    return <InboxEmptyState />;
  }

  return (
    <div className="space-y-8">
      {burning.length > 0 ? (
        <InboxDayGroup title="Горят и под угрозой" accent={HEALTH_META.critical.dot} tasks={burning} projectsById={projectsById} onPromote={onPromote} />
      ) : null}
      {priority.length > 0 ? (
        <InboxDayGroup title="По проектам" accent={PRIORITY_META.medium.dot} tasks={priority} projectsById={projectsById} onPromote={onPromote} />
      ) : null}
      {rest.length > 0 ? (
        <InboxDayGroup title="Остальные" accent="#A1A1AA" tasks={rest} projectsById={projectsById} onPromote={onPromote} />
      ) : null}
    </div>
  );
}

function InboxDayGroup({
  title,
  accent,
  tasks,
  projectsById,
  onPromote,
}: {
  title: string;
  accent: string;
  tasks: V2TaskWithMeta[];
  projectsById: Map<string, PortfolioProject>;
  onPromote: (taskId: string) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <h2 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">{title}</h2>
        <span className="v2-tnum text-[12px] text-[var(--v2-ink-400)]">{tasks.length}</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {tasks.map((task) => (
          <InboxTaskCard key={task.id} task={task} projectsById={projectsById} onPromote={() => onPromote(task.id)} />
        ))}
      </div>
    </section>
  );
}

export function InboxWeekView({
  buckets,
  projectsById,
  dragId,
  onDragStart,
  onDragEnd,
  onDrop,
  onPromote,
}: {
  buckets: Record<V2InboxBucket, V2TaskWithMeta[]>;
  projectsById: Map<string, PortfolioProject>;
} & InboxDndProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {INBOX_BUCKETS.map(({ key, label }) => (
        <InboxBucketColumn
          key={key}
          bucketKey={key}
          label={label}
          tasks={buckets[key] ?? []}
          projectsById={projectsById}
          dragId={dragId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDrop={() => onDrop(key)}
          onPromote={onPromote}
          variant="grid"
        />
      ))}
    </div>
  );
}

export function InboxKanbanView({
  buckets,
  projectsById,
  dragId,
  onDragStart,
  onDragEnd,
  onDrop,
  onPromote,
}: {
  buckets: Record<V2InboxBucket, V2TaskWithMeta[]>;
  projectsById: Map<string, PortfolioProject>;
} & InboxDndProps) {
  return (
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4">
      {INBOX_BUCKETS.map(({ key, label, dot }) => (
        <InboxBucketColumn
          key={key}
          bucketKey={key}
          label={label}
          dot={dot}
          tasks={buckets[key] ?? []}
          projectsById={projectsById}
          dragId={dragId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDrop={() => onDrop(key)}
          onPromote={onPromote}
          variant="kanban"
        />
      ))}
    </div>
  );
}

function InboxBucketColumn({
  bucketKey,
  label,
  dot,
  tasks,
  projectsById,
  dragId,
  onDragStart,
  onDragEnd,
  onDrop,
  onPromote,
  variant,
}: {
  bucketKey: V2InboxBucket;
  label: string;
  dot?: string;
  tasks: V2TaskWithMeta[];
  projectsById: Map<string, PortfolioProject>;
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDrop: () => void;
  onPromote: (taskId: string) => void;
  variant: "grid" | "kanban";
}) {
  const meta = INBOX_BUCKETS.find((b) => b.key === bucketKey)!;

  if (variant === "kanban") {
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onDrop();
        }}
        className="v2-kcol flex w-[300px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm"
      >
        <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot ?? meta.dot }} />
          <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{label}</h3>
          <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{tasks.length}</span>
        </div>
        <div className="flex min-h-[160px] flex-col gap-2.5 p-2.5">
          {tasks.length === 0 ? (
            <div className="v2-tight py-8 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пока пусто</div>
          ) : (
            tasks.map((task, i) => (
              <div key={task.id} className="v2-card-in" style={{ animationDelay: `${i * 40}ms` }}>
                <InboxTaskCard
                  task={task}
                  projectsById={projectsById}
                  draggable
                  dragging={dragId === task.id}
                  onDragStart={() => onDragStart(task.id)}
                  onDragEnd={onDragEnd}
                  onPromote={() => onPromote(task.id)}
                  compact
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      className="v2-card flex min-h-[320px] flex-col p-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
        {label}
        <span className="v2-tnum font-normal text-[var(--v2-ink-400)]">({tasks.length})</span>
      </h2>
      <div className="flex flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <InboxTaskCard
            key={task.id}
            task={task}
            projectsById={projectsById}
            draggable
            dragging={dragId === task.id}
            onDragStart={() => onDragStart(task.id)}
            onDragEnd={onDragEnd}
            onPromote={() => onPromote(task.id)}
            compact
          />
        ))}
      </div>
    </section>
  );
}

function InboxEmptyState() {
  return (
    <div className="v2-card flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
      <div className="text-[15px] font-medium text-[var(--v2-ink-700)]">Входящие пусты</div>
      <p className="mt-1 max-w-[36ch] text-[13px] text-[var(--v2-ink-500)]">
        Добавьте задачу выше — она появится здесь для разбора и планирования.
      </p>
    </div>
  );
}
