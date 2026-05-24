"use client";

import { formatBucketSubtitle } from "@/lib/v2/format";
import { BUCKET_LABELS, BUCKET_ORDER, canDropTaskOnHomeBucket } from "@/lib/v2/tasks/task-buckets";
import type { V2TaskBucket, V2TaskWithMeta } from "@/lib/v2/types";
import { InboxHighlightLegend } from "@/components/v2/inbox/inbox-views";
import { InboxTaskCard } from "@/components/v2/inbox/inbox-task-card";
import { TaskSection } from "@/components/v2/home/task-section";
import { HEALTH_META } from "@/components/v2/projects/portfolio-meta";
import type { PortfolioProject } from "@/lib/v2/projects/portfolio-types";

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

const WEEK_BUCKETS: { key: V2TaskBucket; dot: string }[] = [
  { key: "overdue", dot: HEALTH_META.critical.dot },
  { key: "today", dot: "#3B6FF7" },
  { key: "tomorrow", dot: "#A1A1AA" },
  { key: "this_week", dot: "#A1A1AA" },
  { key: "later", dot: "#D4D4D8" },
];

type HomeKanbanColumnKey = "unassigned" | "today" | "tomorrow" | "this_week" | "later";

const KANBAN_COLUMNS: { key: HomeKanbanColumnKey; label: string; dot: string; dropBucket?: V2TaskBucket }[] = [
  { key: "unassigned", label: "Нераспределённые", dot: "#F59E0B" },
  { key: "today", label: BUCKET_LABELS.today, dot: "#3B6FF7", dropBucket: "today" },
  { key: "tomorrow", label: BUCKET_LABELS.tomorrow, dot: "#A1A1AA", dropBucket: "tomorrow" },
  { key: "this_week", label: BUCKET_LABELS.this_week, dot: "#A1A1AA", dropBucket: "this_week" },
  { key: "later", label: BUCKET_LABELS.later, dot: "#D4D4D8", dropBucket: "later" },
];

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

function HomeKanbanColumn({
  label,
  dot,
  tasks,
  projectsById,
  dragId,
  onDragStart,
  onDragEnd,
  onOpenTask,
  onDrop,
  dropActive,
  onDragEnterColumn,
}: {
  label: string;
  dot: string;
  tasks: V2TaskWithMeta[];
  projectsById: Map<string, PortfolioProject>;
  dragId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onOpenTask: (id: string) => void;
  onDrop?: () => void;
  dropActive?: boolean;
  onDragEnterColumn?: () => void;
}) {
  return (
    <div
      onDragOver={
        onDrop
          ? (e) => {
              e.preventDefault();
              onDragEnterColumn?.();
            }
          : undefined
      }
      onDrop={
        onDrop
          ? (e) => {
              e.preventDefault();
              onDrop();
              onDragEnd();
            }
          : undefined
      }
      className={`v2-kcol flex w-[280px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm transition-all ${
        dropActive ? "bg-[var(--v2-brand-50)]/60 ring-2 ring-[var(--v2-brand-400)] ring-offset-2 ring-offset-transparent" : ""
      }`}
    >
      <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{label}</h3>
        <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{tasks.length}</span>
      </div>
      <div className="flex min-h-[120px] flex-col gap-2.5 p-2.5">
        {tasks.length === 0 ? (
          <div className="v2-tight py-6 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пока пусто</div>
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
                onOpen={() => onOpenTask(task.id)}
                compact
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
          <HomeKanbanColumn
            key={key}
            label={BUCKET_LABELS[key]}
            dot={dot}
            tasks={list}
            projectsById={projectsById}
            dragId={dnd.dragId}
            onDragStart={dnd.onDragStart}
            onDragEnd={dnd.onDragEnd}
            onOpenTask={onOpenTask}
            onDrop={canDropTaskOnHomeBucket(key) ? () => dnd.onDrop(key) : undefined}
          />
        );
      })}
    </div>
  );
}

export function HomeKanbanView({
  filteredGroups,
  unassignedTasks,
  showUnassigned,
  projectsById,
  dragId,
  dragOverBucket,
  onDragStart,
  onDragEnd,
  onDropBucket,
  onDragOverBucket,
  onOpenTask,
}: {
  filteredGroups: Record<string, V2TaskWithMeta[]>;
  unassignedTasks: V2TaskWithMeta[];
  showUnassigned: boolean;
  projectsById: Map<string, PortfolioProject>;
  dragId: string | null;
  dragOverBucket: V2TaskBucket | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDropBucket: (bucket: V2TaskBucket) => void;
  onDragOverBucket: (bucket: V2TaskBucket | null) => void;
  onOpenTask: (id: string) => void;
}) {
  const columnTasks: Record<HomeKanbanColumnKey, V2TaskWithMeta[]> = {
    unassigned: unassignedTasks,
    today: [...(filteredGroups.overdue ?? []), ...(filteredGroups.today ?? [])],
    tomorrow: filteredGroups.tomorrow ?? [],
    this_week: filteredGroups.this_week ?? [],
    later: filteredGroups.later ?? [],
  };

  const columns = showUnassigned ? KANBAN_COLUMNS : KANBAN_COLUMNS.filter((c) => c.key !== "unassigned");

  return (
    <>
      <div className="mb-4">
        <InboxHighlightLegend />
      </div>
      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-4">
        {columns.map(({ key, label, dot, dropBucket }) => {
          const list = columnTasks[key];
          if (key === "unassigned" && !showUnassigned) return null;
          return (
            <HomeKanbanColumn
              key={key}
              label={label}
              dot={dot}
              tasks={list}
              projectsById={projectsById}
              dragId={dragId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onOpenTask={onOpenTask}
              onDrop={dropBucket && canDropTaskOnHomeBucket(dropBucket) ? () => onDropBucket(dropBucket) : undefined}
              dropActive={!!dropBucket && dragOverBucket === dropBucket}
              onDragEnterColumn={dropBucket ? () => onDragOverBucket(dropBucket) : undefined}
            />
          );
        })}
      </div>
    </>
  );
}
