"use client";

import type { PortfolioKanbanStatus, PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import { isFinishedKanbanStatus } from "@/lib/v2/projects/portfolio-types";
import { currentMonthLabelPrep, fmtRubShort, pluralRu } from "@/lib/v2/projects/portfolio-utils";
import { ProjectTile } from "@/components/v2/projects/project-tile";
import {
  AvatarStack,
  HealthDot,
  ProgressBar,
  ProjectBadge,
  EngagementBadge,
} from "@/components/v2/projects/project-atoms";
import { STATUS_META, STATUS_FILTER_ORDER, STATUS_ORDER } from "@/components/v2/projects/portfolio-meta";
import { V2Icons } from "@/components/v2/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";

export function ViewSwitcher({ view, setView }: { view: "list" | "kanban"; setView: (v: "list" | "kanban") => void }) {
  return (
    <div className="inline-flex items-center rounded-xl bg-white p-1 shadow-[var(--v2-shadow-card)]">
      {([
        ["list", "Список", V2Icons.list],
        ["kanban", "Канбан", V2Icons.kanban],
      ] as const).map(([id, label, Icon]) => {
        const active = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition ${active ? "bg-[var(--v2-ink-900)] text-white" : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusChips({
  filter,
  setFilter,
  counts,
  totalActive,
}: {
  filter: string;
  setFilter: (v: string) => void;
  counts: Record<string, number>;
  totalActive: number;
}) {
  const items = [
    { id: "all", label: "Все", dot: "#0A0A0B", count: totalActive },
    ...STATUS_FILTER_ORDER.map((s) => ({
      id: s,
      label: STATUS_META[s].label,
      dot: STATUS_META[s].dot,
      count: counts[s] || 0,
    })),
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => {
        const active = filter === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => setFilter(it.id)}
            className={`v2-tight inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[12.5px] transition ${active ? "bg-[var(--v2-ink-900)] text-white shadow-[var(--v2-shadow-card)]" : "bg-white text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] hover:shadow-[var(--v2-shadow-cardHv)]"}`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: active ? "#fff" : it.dot, opacity: active ? 0.9 : 1 }} />
            <span className="font-medium">{it.label}</span>
            <span className={`v2-tnum text-[11px] ${active ? "text-white/60" : "text-[var(--v2-ink-400)]"}`}>{it.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
  accent = "#0A0A0B",
  open,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  count: number;
  accent?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="group flex w-full items-center gap-3 py-3">
      <V2Icons.chev className={`h-4 w-4 text-[var(--v2-ink-400)] transition-transform ${open ? "" : "-rotate-90"}`} />
      <span className="inline-flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
        <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">{title}</h3>
      </span>
      {subtitle ? <span className="text-[12.5px] text-[var(--v2-ink-500)]">{subtitle}</span> : null}
      <span className="ml-auto text-[12px] text-[var(--v2-ink-500)]">
        <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">{count}</span> {pluralRu(count, ["проект", "проекта", "проектов"])}
      </span>
    </button>
  );
}

export function QuickAddTile({
  defaultStatus,
  onAdd,
}: {
  defaultStatus: PortfolioKanbanStatus;
  onAdd: (name: string, status: PortfolioKanbanStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (open) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onAdd(name.trim(), defaultStatus);
            setName("");
            setOpen(false);
          }
        }}
        className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[var(--v2-shadow-card)]"
      >
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-dashed border-[var(--v2-ink-300)] text-[var(--v2-ink-400)]">
          <V2Icons.plus className="h-5 w-5" />
        </span>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (!name) setOpen(false);
          }}
          placeholder="Название нового проекта… Enter — добавить, Esc — отмена"
          className="v2-tight flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-[var(--v2-ink-400)]"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setName("");
              setOpen(false);
            }
          }}
        />
        <span className="font-mono text-[10.5px] text-[var(--v2-ink-400)]">↵</span>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="v2-tight flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--v2-ink-300)] text-[13px] text-[var(--v2-ink-500)] transition hover:border-[var(--v2-ink-400)] hover:bg-white hover:text-[var(--v2-ink-900)]"
    >
      <V2Icons.plus className="h-4 w-4" /> Добавить проект
    </button>
  );
}

export function ListSection({
  title,
  subtitle,
  accent,
  projects: list,
  starredIds,
  onOpen,
  onToggleStar,
  onAdd,
  defaultStatus,
  allowAdd = true,
  canDelete,
  onDeleteRequest,
}: {
  title: string;
  subtitle?: string;
  accent: string;
  projects: PortfolioProject[];
  starredIds: Set<string>;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onAdd: (name: string, status: PortfolioKanbanStatus) => void;
  defaultStatus: PortfolioKanbanStatus;
  allowAdd?: boolean;
  canDelete?: boolean;
  onDeleteRequest?: (project: PortfolioProject) => void;
}) {
  const [open, setOpen] = useState(true);
  if (list.length === 0 && !allowAdd) return null;
  return (
    <section className="mt-2">
      <SectionHeader title={title} subtitle={subtitle} accent={accent} count={list.length} open={open} onToggle={() => setOpen((v) => !v)} />
      {open ? (
        <div className="flex flex-col gap-3">
          {list.map((p, i) => (
            <div key={p.id} className="v2-row-in" style={{ animationDelay: `${i * 30}ms` }}>
              <ProjectTile
                project={p}
                starred={starredIds.has(p.id)}
                onOpen={onOpen}
                onToggleStar={onToggleStar}
                canDelete={canDelete}
                onDeleteRequest={onDeleteRequest}
              />
            </div>
          ))}
          {allowAdd ? <QuickAddTile defaultStatus={defaultStatus} onAdd={onAdd} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function DoneRow({ p, onOpen }: { p: PortfolioProject; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--v2-ink-50)]/70"
    >
      <ProjectBadge project={p} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="v2-tight truncate text-[13.5px] font-medium text-[var(--v2-ink-800)]">{p.name}</h4>
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <V2Icons.check className="h-[10px] w-[10px]" />
          </span>
        </div>
        <div className="mt-0.5 text-[11.5px] text-[var(--v2-ink-500)]">{p.category} · сдан {p.deadline}</div>
      </div>
      <div className="hidden items-center gap-5 text-[11.5px] text-[var(--v2-ink-500)] md:flex">
        <span className="v2-tnum">
          {p.tasksDone}/{p.tasksTotal} задач
        </span>
        <span className="v2-tnum">
          {p.loggedHours}ч · {fmtRubShort(p.spent)} / {fmtRubShort(p.budget)} ₽
        </span>
        <AvatarStack members={p.team} size={22} max={4} />
      </div>
      <V2Icons.chevR className="h-4 w-4 text-[var(--v2-ink-300)] transition group-hover:text-[var(--v2-ink-600)]" />
    </button>
  );
}

export function DoneUnpaidSection({
  projects: list,
  onOpen,
}: {
  projects: PortfolioProject[];
  onOpen: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (list.length === 0) return null;
  const totalBudget = list.reduce((a, p) => a + p.budget, 0);
  const totalSpent = list.reduce((a, p) => a + p.spent, 0);
  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-5 py-3.5 transition hover:bg-[var(--v2-ink-50)]/70"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <V2Icons.ruble className="h-[14px] w-[14px]" />
          </span>
          <div className="flex items-baseline gap-2">
            <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Завершены, не оплачены</h3>
            <span className="text-[12.5px] text-[var(--v2-ink-500)]">
              — {list.length} {pluralRu(list.length, ["проект", "проекта", "проектов"])} ждут оплату
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-[12px] text-[var(--v2-ink-500)]">
            <span className="v2-tnum">
              сумма {fmtRubShort(totalSpent)} / {fmtRubShort(totalBudget)} ₽
            </span>
            <V2Icons.chev className={`h-4 w-4 text-[var(--v2-ink-400)] transition-transform ${open ? "" : "-rotate-90"}`} />
          </div>
        </button>
        {open ? (
          <div className="divide-y divide-[var(--v2-ink-100)]/70 border-t border-[var(--v2-ink-100)]/70">
            {list.map((p) => (
              <DoneRow key={p.id} p={p} onOpen={onOpen} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function DoneSection({ projects: list, onOpen }: { projects: PortfolioProject[]; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (list.length === 0) return null;
  const totalBudget = list.reduce((a, p) => a + p.budget, 0);
  const totalSpent = list.reduce((a, p) => a + p.spent, 0);
  const month = currentMonthLabelPrep();
  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-5 py-3.5 transition hover:bg-[var(--v2-ink-50)]/70"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <V2Icons.check className="h-[14px] w-[14px]" />
          </span>
          <div className="flex items-baseline gap-2">
            <h3 className="v2-tight text-[14px] font-semibold text-[var(--v2-ink-900)]">Сданы в {month}</h3>
            <span className="text-[12.5px] text-[var(--v2-ink-500)]">
              — {list.length} {pluralRu(list.length, ["проект", "проекта", "проектов"])} закрыты
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-[12px] text-[var(--v2-ink-500)]">
            <span className="v2-tnum">
              сумма {fmtRubShort(totalSpent)} / {fmtRubShort(totalBudget)} ₽
            </span>
            <V2Icons.chev className={`h-4 w-4 text-[var(--v2-ink-400)] transition-transform ${open ? "" : "-rotate-90"}`} />
          </div>
        </button>
        {open ? (
          <div className="divide-y divide-[var(--v2-ink-100)]/70 border-t border-[var(--v2-ink-100)]/70">
            {list.map((p) => (
              <DoneRow key={p.id} p={p} onOpen={onOpen} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KanbanCard({
  p,
  starred,
  onOpen,
  onToggleStar,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  p: PortfolioProject;
  starred: boolean;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  dragging: boolean;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const overdue = p.deadlineDays !== null && p.deadlineDays < 0 && !isFinishedKanbanStatus(p.status);
  const soon = p.deadlineDays !== null && p.deadlineDays >= 0 && p.deadlineDays <= 3 && !isFinishedKanbanStatus(p.status);
  const tasksPct = p.tasksTotal > 0 ? p.tasksDone / p.tasksTotal : 0;
  const overBudget = p.budget > 0 && p.spent > p.budget;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(p.id, e)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(p.id)}
      className={`group relative cursor-pointer rounded-2xl bg-white p-3.5 shadow-[var(--v2-shadow-card)] transition-all duration-200 hover:shadow-[var(--v2-shadow-cardHv)] ${dragging ? "scale-[0.98] opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <ProjectBadge project={p} size="sm" />
        <span className="v2-tight truncate text-[11.5px] font-medium text-[var(--v2-ink-500)]">{p.name.split(" ")[0]}</span>
        <span className="text-[var(--v2-ink-300)]">·</span>
        <span className="v2-tight truncate text-[11.5px] text-[var(--v2-ink-500)]">{p.category}</span>
        {p.clientName ? (
          <>
            <span className="text-[var(--v2-ink-300)]">·</span>
            <span className="v2-tight truncate text-[11.5px] font-medium text-[var(--v2-ink-700)]">{p.clientName}</span>
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <HealthDot health={p.health} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(p.id);
            }}
            className={`transition ${starred ? "" : "opacity-0 group-hover:opacity-100"}`}
          >
            {starred ? (
              <V2Icons.starFill className="h-[13px] w-[13px] text-amber-400" />
            ) : (
              <V2Icons.star className="h-[13px] w-[13px] text-[var(--v2-ink-400)] hover:text-amber-400" />
            )}
          </button>
        </div>
      </div>
      <h4 className="v2-tight mt-2.5 line-clamp-2 text-[14px] font-semibold leading-[1.25] text-[var(--v2-ink-900)]">{p.name}</h4>
      {p.engagementType === "retainer" ? (
        <div className="mt-1.5">
          <EngagementBadge type={p.engagementType} />
        </div>
      ) : null}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-[var(--v2-ink-500)]">Задачи</span>
          <span className="v2-tnum font-medium text-[var(--v2-ink-700)]">
            {p.tasksDone}
            <span className="font-normal text-[var(--v2-ink-400)]">/{p.tasksTotal}</span>
          </span>
        </div>
        <ProgressBar pct={tasksPct} status={p.status} height={4} />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1 text-[var(--v2-ink-500)]">
          <V2Icons.ruble className="h-[12px] w-[12px]" />
          Финансы
        </span>
        <span className={`v2-tnum font-medium ${overBudget ? "text-red-600" : "text-[var(--v2-ink-700)]"}`}>
          {fmtRubShort(p.spent)}
          <span className={`font-normal ${overBudget ? "text-red-400" : "text-[var(--v2-ink-400)]"}`}>/{fmtRubShort(p.budget)} ₽</span>
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--v2-ink-100)]/70 pt-3">
        <AvatarStack members={p.team} size={22} max={4} />
        <div className="flex items-center gap-1.5">
          {p.unread > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--v2-brand-50)] px-1.5 py-[2px] text-[10.5px] font-semibold text-[var(--v2-brand-700)]">
              <V2Icons.chat className="h-[11px] w-[11px]" /> {p.unread}
            </span>
          ) : null}
          <span className={`v2-tight v2-tnum inline-flex items-center gap-1 text-[11.5px] font-medium ${overdue ? "text-red-600" : soon ? "text-amber-700" : "text-[var(--v2-ink-600)]"}`}>
            <V2Icons.clock className="h-[12px] w-[12px]" />
            {p.deadline}
          </span>
        </div>
      </div>
      {p.status === "paused" && p.pauseReason ? (
        <div className="v2-tight mt-3 rounded-md bg-violet-50 px-2.5 py-1.5 text-[11.5px] text-violet-700">{p.pauseReason}</div>
      ) : null}
    </div>
  );
}

function KanbanColumn({
  status,
  projects: list,
  starredIds,
  dropTarget,
  onDragEnter,
  onDragOver,
  onDrop,
  onOpen,
  onToggleStar,
  draggingId,
  onDragStart,
  onDragEnd,
  onAddInColumn,
}: {
  status: PortfolioKanbanStatus;
  projects: PortfolioProject[];
  starredIds: Set<string>;
  dropTarget: PortfolioKanbanStatus | null;
  onDragEnter: (s: PortfolioKanbanStatus) => void;
  onDragOver: (s: PortfolioKanbanStatus) => void;
  onDrop: (s: PortfolioKanbanStatus) => void;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  draggingId: string | null;
  onDragStart: (id: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onAddInColumn: (s: PortfolioKanbanStatus) => void;
}) {
  const meta = STATUS_META[status];
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(status);
      }}
      onDragEnter={() => onDragEnter(status)}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(status);
      }}
      className={`v2-kcol flex w-[300px] shrink-0 flex-col rounded-2xl bg-white/40 backdrop-blur-sm transition-all ${dropTarget === status ? "bg-[var(--v2-brand-50)]/60 ring-2 ring-[var(--v2-brand-400)] ring-offset-2 ring-offset-transparent" : ""}`}
    >
      <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-[var(--v2-ink-100)]/70 bg-white/70 px-3.5 py-3 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
        <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">{meta.label}</h3>
        <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{list.length}</span>
        <button
          type="button"
          onClick={() => onAddInColumn(status)}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--v2-ink-400)] hover:bg-[var(--v2-ink-100)] hover:text-[var(--v2-ink-900)]"
          title="Добавить"
        >
          <V2Icons.plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-[120px] flex-col gap-2.5 p-2.5">
        {list.length === 0 ? (
          <div className="v2-tight py-6 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пока пусто</div>
        ) : (
          list.map((p, i) => (
            <div key={p.id} className="v2-card-in" style={{ animationDelay: `${i * 40}ms` }}>
              <KanbanCard
                p={p}
                starred={starredIds.has(p.id)}
                dragging={draggingId === p.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onOpen={onOpen}
                onToggleStar={onToggleStar}
              />
            </div>
          ))
        )}
        <button
          type="button"
          onClick={() => onAddInColumn(status)}
          className="v2-tight mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--v2-ink-300)] text-[12.5px] text-[var(--v2-ink-500)] transition hover:border-[var(--v2-ink-400)] hover:bg-white hover:text-[var(--v2-ink-800)]"
        >
          <V2Icons.plus className="h-[14px] w-[14px]" /> Добавить
        </button>
      </div>
    </div>
  );
}

export function KanbanBoard({
  projects: list,
  starredIds,
  onOpen,
  onToggleStar,
  onMove,
  onAdd,
  onAddRetainer,
}: {
  projects: PortfolioProject[];
  starredIds: Set<string>;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onMove: (id: string, status: PortfolioKanbanStatus) => void;
  onAdd: (name: string, status: PortfolioKanbanStatus) => void;
  onAddRetainer: (name: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PortfolioKanbanStatus | null>(null);

  const oneOffProjects = useMemo(() => list.filter((p) => p.engagementType !== "retainer"), [list]);
  const retainerProjects = useMemo(
    () => list.filter((p) => p.engagementType === "retainer" && !isFinishedKanbanStatus(p.status)),
    [list]
  );

  const grouped = useMemo(() => {
    const g: Record<string, PortfolioProject[]> = {};
    STATUS_ORDER.forEach((s) => {
      g[s] = [];
    });
    oneOffProjects.forEach((p) => {
      g[p.status]?.push(p);
    });
    return g as Record<PortfolioKanbanStatus, PortfolioProject[]>;
  }, [oneOffProjects]);

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4">
        {STATUS_ORDER.map((s) => (
          <KanbanColumn
            key={s}
            status={s}
            projects={grouped[s]}
            starredIds={starredIds}
            dropTarget={dropTarget}
            onDragEnter={(st) => setDropTarget(st)}
            onDragOver={(st) => setDropTarget(st)}
            onDrop={(st) => {
              if (draggingId) onMove(draggingId, st);
              setDropTarget(null);
              setDraggingId(null);
            }}
            onOpen={onOpen}
            onToggleStar={onToggleStar}
            draggingId={draggingId}
            onDragStart={(id) => setDraggingId(id)}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTarget(null);
            }}
            onAddInColumn={(st) => onAdd("Новый проект", st)}
          />
        ))}
        <RetainerKanbanColumn
          projects={retainerProjects}
          starredIds={starredIds}
          onOpen={onOpen}
          onToggleStar={onToggleStar}
          onAdd={() => onAddRetainer("Новый постоянный проект")}
        />
      </div>
    </div>
  );
}

export function buildListSections(
  filteredActive: PortfolioProject[],
  statusFilter: string
): Array<{
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  list: PortfolioProject[];
  defaultStatus: PortfolioKanbanStatus;
  allowAdd: boolean;
}> {
  const oneOff = filteredActive.filter((p) => p.engagementType !== "retainer");

  if (statusFilter === "all") {
    const isBurning = (p: PortfolioProject) => p.health === "critical" || p.health === "at_risk";
    const burning = oneOff.filter(isBurning);
    const inwork = oneOff.filter(
      (p) => (p.status === "in_progress" || p.status === "review") && !isBurning(p)
    );
    const upcoming = oneOff.filter((p) => p.status === "not_started" && !isBurning(p));
    const paused = oneOff.filter((p) => p.status === "paused" && !isBurning(p));
    return [
      { id: "burning", title: "Горят и под угрозой", subtitle: "нужна помощь / решения", accent: "#EF4444", list: burning, defaultStatus: "in_progress", allowAdd: false },
      { id: "in_progress", title: "В работе", subtitle: "идёт ежедневная активность", accent: "#3B6FF7", list: inwork, defaultStatus: "in_progress", allowAdd: true },
      { id: "not_started", title: "Не начаты", subtitle: "старт по плану", accent: "#A1A1AA", list: upcoming, defaultStatus: "not_started", allowAdd: true },
      { id: "paused", title: "На паузе", subtitle: "возобновим по триггеру", accent: "#7C3AED", list: paused, defaultStatus: "paused", allowAdd: false },
    ];
  }
  const meta = STATUS_META[statusFilter as PortfolioKanbanStatus];
  return [
    {
      id: statusFilter,
      title: meta?.label ?? statusFilter,
      subtitle: "",
      accent: meta?.dot ?? "#0A0A0B",
      list: oneOff,
      defaultStatus: statusFilter as PortfolioKanbanStatus,
      allowAdd: true,
    },
  ];
}

export function RetainerListSection({
  projects: list,
  starredIds,
  onOpen,
  onToggleStar,
  onAdd,
  canDelete,
  onDeleteRequest,
}: {
  projects: PortfolioProject[];
  starredIds: Set<string>;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onAdd: (name: string) => void;
  canDelete?: boolean;
  onDeleteRequest?: (project: PortfolioProject) => void;
}) {
  return (
    <ListSection
      title="Постоянные проекты"
      subtitle="ежемесячная работа с клиентами"
      accent="#7C3AED"
      projects={list}
      starredIds={starredIds}
      onOpen={onOpen}
      onToggleStar={onToggleStar}
      onAdd={(name) => onAdd(name)}
      defaultStatus="in_progress"
      allowAdd
      canDelete={canDelete}
      onDeleteRequest={onDeleteRequest}
    />
  );
}

function RetainerKanbanColumn({
  projects: list,
  starredIds,
  onOpen,
  onToggleStar,
  onAdd,
}: {
  projects: PortfolioProject[];
  starredIds: Set<string>;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="v2-kcol flex w-[300px] shrink-0 flex-col rounded-2xl bg-violet-50/40 backdrop-blur-sm">
      <div className="v2-kcol-head sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl border-b border-violet-100/80 bg-white/70 px-3.5 py-3 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
        <h3 className="v2-tight text-[13px] font-semibold text-[var(--v2-ink-900)]">Постоянные</h3>
        <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{list.length}</span>
        <button
          type="button"
          onClick={onAdd}
          className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--v2-ink-400)] hover:bg-violet-100 hover:text-violet-800"
          title="Добавить постоянный проект"
        >
          <V2Icons.plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex min-h-[120px] flex-col gap-2.5 p-2.5">
        {list.length === 0 ? (
          <div className="v2-tight py-6 text-center text-[12px] italic text-[var(--v2-ink-400)]">Пока пусто</div>
        ) : (
          list.map((p, i) => (
            <div key={p.id} className="v2-card-in" style={{ animationDelay: `${i * 40}ms` }}>
              <KanbanCard
                p={p}
                starred={starredIds.has(p.id)}
                dragging={false}
                onDragStart={() => {}}
                onDragEnd={() => {}}
                onOpen={onOpen}
                onToggleStar={onToggleStar}
              />
            </div>
          ))
        )}
        <button
          type="button"
          onClick={onAdd}
          className="v2-tight mt-1 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-violet-300 text-[12.5px] text-violet-700 transition hover:border-violet-400 hover:bg-white"
        >
          <V2Icons.plus className="h-[14px] w-[14px]" /> Добавить
        </button>
      </div>
    </div>
  );
}
