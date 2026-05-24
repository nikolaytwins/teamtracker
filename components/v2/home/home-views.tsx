"use client";

import { formatBucketSubtitle } from "@/lib/v2/format";
import { BUCKET_LABELS, BUCKET_ORDER, canDropTaskOnHomeBucket } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskBucket, V2TaskStatus, V2TaskWithMeta } from "@/lib/v2/types";
import { InboxHighlightLegend } from "@/components/v2/inbox/inbox-views";
import { InboxTaskCard } from "@/components/v2/inbox/inbox-task-card";
import { TaskSection } from "@/components/v2/home/task-section";
import { HEALTH_META } from "@/components/v2/projects/portfolio-meta";
import type { PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import { useMemo } from "react";

const WEEK_BUCKETS: { key: V2TaskBucket; dot: string }[] = [
  { key: "overdue", dot: HEALTH_META.critical.dot },
  { key: "today", dot: "#3B6FF7" },
  { key: "tomorrow", dot: "#A1A1AA" },
  { key: "this_week", dot: "#A1A1AA" },
  { key: "later", dot: "#D4D4D8" },
];

const STATUS_COLUMNS: { key: V2TaskStatus; label: string; dot: string }[] = [
  { key: "todo", label: "К выполнению", dot: "#A1A1AA" },
  { key: "in_progress", label: "В работе", dot: "#3B6FF7" },
  { key: "review", label: "На проверке", dot: "#F59E0B" },
  { key: "done", label: "Готово", dot: "#10B981" },
];

const SECTION_ACCENTS: Partial<Record<V2TaskBucket, string>> = {
  overdue: "#EF4444",
  today: "#3B6FF7",
  tomorrow: "#A1A1AA",
  this_week: "#A1A1AA",
  later: "#D4D4D8",
  done_today: "#10B981",
};

const BUCKET_EMPTY_LABELS: Partial<Record<V2TaskBucket, string>> = {
  today: "На сегодня задач нет",
  tomorrow: "На завтра задач нет",
  this_week: "На этой неделе задач нет",
  later: "Задач на потом пока нет",
  done_today: "Сегодня ещё ничего не завершено",
};

const ALWAYS_VISIBLE_BUCKETS = new Set<V2TaskBucket>(["today", "tomorrow", "this_week", "later", "done_today"]);

type HomeDndProps = {
  dragId: string | null;
  dragOverBucket: V2TaskBucket | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOverBucket: (bucket: V2TaskBucket | null) => void;
  onDropOnBucket: (bucket: V2TaskBucket) => void;
};

type HomeTaskActions = {
  runningId: string | null;
  elapsed: number;
  onToggleRun: (id: string) => void;
  onToggleDone: (id: string) => void;
  onOpenTask: (id: string) => void;
};

export function HomeDayView({
  filteredGroups,
  dnd,
  actions,
}: {
  filteredGroups: Record<string, V2TaskWithMeta[]>;
  dnd: HomeDndProps;
  actions: HomeTaskActions;
}) {
  return (
    <>
      {BUCKET_ORDER.map((bucket) => {
        const list = filteredGroups[bucket] ?? [];
        const showWhileDragging = !!dnd.dragId && canDropTaskOnHomeBucket(bucket);
        if (!ALWAYS_VISIBLE_BUCKETS.has(bucket) && !list.length && !showWhileDragging) return null;
        return (
          <TaskSection
            key={bucket}
            bucket={bucket}
            title={BUCKET_LABELS[bucket]}
            subtitle={formatBucketSubtitle(bucket)}
            accent={SECTION_ACCENTS[bucket] ?? "#A1A1AA"}
            tasks={list}
            runningId={actions.runningId}
            elapsed={actions.elapsed}
            onToggleRun={actions.onToggleRun}
            onToggleDone={actions.onToggleDone}
            onOpenTask={actions.onOpenTask}
            hideWhenEmpty={bucket === "overdue"}
            emptyLabel={BUCKET_EMPTY_LABELS[bucket] ?? "Задач нет"}
            dragId={dnd.dragId}
            dragOverBucket={dnd.dragOverBucket}
            onDragStart={dnd.onDragStart}
            onDragEnd={dnd.onDragEnd}
            onDragOverBucket={dnd.onDragOverBucket}
            onDropOnBucket={dnd.onDropOnBucket}
          />
        );
      })}
    </>
  );
}

export function HomeWeekView({
  filteredGroups,
  projectsById,
  dnd,
  onOpenTask,
}: {
  filteredGroups: Record<string, V2TaskWithMeta[]>;
  projectsById: Map<string, PortfolioProject>;
  dnd: Pick<HomeDndProps, "dragId" | "onDragStart" | "onDragEnd"> & {
    onDrop: (bucket: V2TaskBucket) => void;
  };
  onOpenTask: (id: string) => void;
}) {
  return (
    <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4">
      {WEEK_BUCKETS.map(({ key, dot }) => {
        const list = filteredGroups[key] ?? [];
        if (key === "overdue" && list.length === 0) return null;
        return (
          <div
            key={key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (canDropTaskOnHomeBucket(key)) dnd.onDrop(key);
              dnd.onDragEnd();
            }}
            className="v2-kcol flex w-[280px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm"
          >
            <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
              <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{BUCKET_LABELS[key]}</h3>
              <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{list.length}</span>
            </div>
            <div className="flex min-h-[120px] flex-col gap-2.5 p-2.5">
              {list.length === 0 ? (
                <div className="v2-tight py-6 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пока пусто</div>
              ) : (
                list.map((task, i) => (
                  <div key={task.id} className="v2-card-in" style={{ animationDelay: `${i * 40}ms` }}>
                    <InboxTaskCard
                      task={task}
                      projectsById={projectsById}
                      draggable
                      dragging={dnd.dragId === task.id}
                      onDragStart={() => dnd.onDragStart(task.id)}
                      onDragEnd={dnd.onDragEnd}
                      onOpen={() => onOpenTask(task.id)}
                      compact
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HomeKanbanView({
  tasks,
  doneToday,
  projectsById,
  dragId,
  onDragStart,
  onDragEnd,
  onDropStatus,
  onOpenTask,
}: {
  tasks: V2TaskWithMeta[];
  doneToday: V2TaskWithMeta[];
  projectsById: Map<string, PortfolioProject>;
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropStatus: (status: V2TaskStatus) => void;
  onOpenTask: (id: string) => void;
}) {
  const columns = useMemo(() => {
    const cols: Record<V2TaskStatus, V2TaskWithMeta[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    for (const t of tasks) {
      if (t.completed_at) continue;
      cols[t.status]?.push(t);
    }
    for (const t of doneToday) {
      if (!cols.done.some((x) => x.id === t.id)) cols.done.push(t);
    }
    return cols;
  }, [tasks, doneToday]);

  return (
    <>
      <div className="mb-4">
        <InboxHighlightLegend />
      </div>
      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4">
        {STATUS_COLUMNS.map(({ key, label, dot }) => {
          const list = columns[key] ?? [];
          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onDropStatus(key);
                onDragEnd();
              }}
              className="v2-kcol flex w-[280px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm"
            >
              <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{label}</h3>
                <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{list.length}</span>
              </div>
              <div className="flex min-h-[120px] flex-col gap-2.5 p-2.5">
                {list.length === 0 ? (
                  <div className="v2-tight py-6 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пока пусто</div>
                ) : (
                  list.map((task, i) => (
                    <div key={task.id} className="v2-card-in" style={{ animationDelay: `${i * 40}ms` }}>
                      <InboxTaskCard
                        task={task}
                        projectsById={projectsById}
                        draggable
                        dragging={dragId === task.id}
                        onDragStart={() => onDragStart(task.id)}
                        onDragEnd={onDragEnd}
                        onOpen={() => onOpenTask(task.id)}
                        compact
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
