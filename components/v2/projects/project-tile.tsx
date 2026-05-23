"use client";

import type { PortfolioProject } from "@/lib/v2/projects/portfolio-types";
import { deadlineCopy, fmtRubShort, pluralRu } from "@/lib/v2/projects/portfolio-utils";
import {
  AvatarStack,
  BudgetBar,
  HealthDot,
  IconBtn,
  PriorityDot,
  ProgressBar,
  ProjectBadge,
  EngagementBadge,
  rolesSummaryFromHours,
  StatusBadge,
} from "@/components/v2/projects/project-atoms";
import { HEALTH_META } from "@/components/v2/projects/portfolio-meta";
import { V2Icons } from "@/components/v2/ui/icons";
import { useMemo } from "react";

export function ProjectTile({
  project: p,
  starred,
  onOpen,
  onToggleStar,
}: {
  project: PortfolioProject;
  starred: boolean;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
}) {
  const overdue = p.deadlineDays !== null && p.deadlineDays < 0 && p.status !== "done";
  const soon = p.deadlineDays !== null && p.deadlineDays >= 0 && p.deadlineDays <= 3 && p.status !== "done";
  const spent = p.spent;
  const budgetPct = p.budget > 0 ? Math.min(spent / p.budget, 1.2) : 0;
  const overBudget = spent > p.budget;
  const tasksPct = p.tasksTotal > 0 ? p.tasksDone / p.tasksTotal : 0;
  const rolesSummary = useMemo(
    () => rolesSummaryFromHours(p.team, p.hoursByMember),
    [p.team, p.hoursByMember]
  );

  return (
    <div
      onClick={() => onOpen(p.id)}
      className="v2-tile group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-[var(--v2-shadow-card)]"
    >
      <span
        aria-hidden
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: HEALTH_META[p.health].dot, opacity: p.health === "on_track" ? 0 : 1 }}
      />
      <div className="p-5">
        <div className="flex items-start gap-3.5">
          <ProjectBadge project={p} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2">
              <h3 className="v2-tighter mr-1 text-[18px] font-semibold leading-[1.2] text-[var(--v2-ink-900)]">{p.name}</h3>
              <div className="mt-1 flex items-center gap-1.5">
                <StatusBadge status={p.status} size="sm" />
                <EngagementBadge type={p.engagementType} />
                {p.unread > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--v2-brand-50)] px-1.5 py-[2px] text-[10.5px] font-semibold text-[var(--v2-brand-700)]">
                    <V2Icons.chat className="h-[11px] w-[11px]" /> {p.unread}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--v2-ink-500)]">
              <HealthDot health={p.health} withLabel />
              <span className="text-[var(--v2-ink-300)]">·</span>
              <span className="v2-tight">{p.category}</span>
              <span className="text-[var(--v2-ink-300)]">·</span>
              <PriorityDot priority={p.priority} />
              <span className="text-[var(--v2-ink-300)]">·</span>
              <span className="inline-flex items-center gap-1">
                <V2Icons.clock className="h-[12px] w-[12px]" />
                обновлён {p.lastActivity}
              </span>
            </div>
          </div>
          <div className="-mr-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(p.id);
              }}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${starred ? "text-amber-400" : "text-[var(--v2-ink-400)] opacity-0 hover:bg-[var(--v2-ink-100)] hover:text-amber-400 group-hover:opacity-100"}`}
              title={starred ? "Открепить" : "Закрепить"}
            >
              {starred ? <V2Icons.starFill className="h-4 w-4" /> : <V2Icons.star className="h-4 w-4" />}
            </button>
            <IconBtn title="Ещё" className="opacity-0 group-hover:opacity-100">
              <V2Icons.more className="h-4 w-4" />
            </IconBtn>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-12 gap-5">
          <div className="col-span-12 md:col-span-3">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Команда</div>
            <div className="flex items-center gap-2.5">
              <AvatarStack members={p.team} size={28} max={4} />
              <div className="leading-tight">
                <div className="v2-tight v2-tnum text-[13px] font-medium text-[var(--v2-ink-800)]">
                  {p.team.length} {pluralRu(p.team.length, ["человек", "человека", "человек"])}
                </div>
                <div className="max-w-[160px] truncate text-[11.5px] text-[var(--v2-ink-500)]">
                  {p.team
                    .slice(0, 2)
                    .map((u) => u.name.split(" ")[0])
                    .join(", ")}
                  {p.team.length > 2 ? ` +${p.team.length - 2}` : ""}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Задачи</span>
              <span className="v2-tnum text-[11.5px] text-[var(--v2-ink-500)]">{Math.round(tasksPct * 100)}%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className="v2-tnum v2-tighter text-[20px] font-semibold leading-none text-[var(--v2-ink-900)]">{p.tasksDone}</div>
              <div className="v2-tnum text-[13px] leading-none text-[var(--v2-ink-400)]">/ {p.tasksTotal}</div>
            </div>
            <div className="mt-2">
              <ProgressBar pct={tasksPct} status={p.status} height={5} />
            </div>
          </div>

          <div className="col-span-12 md:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Бюджет</span>
              <span className={`v2-tnum text-[11.5px] ${overBudget ? "font-semibold text-red-600" : "text-[var(--v2-ink-500)]"}`}>
                {Math.round(budgetPct * 100)}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <div className={`v2-tnum v2-tighter text-[20px] font-semibold leading-none ${overBudget ? "text-red-600" : "text-[var(--v2-ink-900)]"}`}>
                {fmtRubShort(spent)}
              </div>
              <div className="v2-tnum text-[13px] leading-none text-[var(--v2-ink-400)]">/ {fmtRubShort(p.budget)} ₽</div>
            </div>
            <div className="mt-2">
              <BudgetBar spent={spent} budget={p.budget} />
            </div>
            <div className="v2-tight mt-1.5 truncate text-[11px] text-[var(--v2-ink-400)]" title={rolesSummary.join(" · ")}>
              {p.loggedHours > 0 ? `${p.loggedHours}ч · ${rolesSummary.join(" · ")}` : "часы пока не списаны"}
            </div>
          </div>

          <div className="col-span-12 flex flex-col md:col-span-3">
            <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v2-ink-500)]">Дедлайн</div>
            <div className={`v2-tnum v2-tighter text-[20px] font-semibold leading-none ${overdue ? "text-red-600" : soon ? "text-amber-700" : "text-[var(--v2-ink-900)]"}`}>
              {p.deadline}
            </div>
            <div className={`v2-tight mt-1.5 text-[12px] ${overdue ? "font-medium text-red-600" : soon ? "font-medium text-amber-700" : "text-[var(--v2-ink-500)]"}`}>
              {deadlineCopy(p.deadlineDays, p.status)}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(p.id);
              }}
              className="v2-tight mt-auto inline-flex h-9 items-center gap-1 self-end rounded-xl bg-[var(--v2-ink-100)]/70 px-3.5 text-[12.5px] font-medium text-[var(--v2-ink-700)] transition hover:bg-[var(--v2-ink-900)] hover:text-white"
            >
              Открыть <V2Icons.arrowR className="h-4 w-4" />
            </button>
          </div>
        </div>

        {p.status === "paused" && p.pauseReason ? (
          <div className="v2-tight mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-[12px] text-violet-700">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            {p.pauseReason}
          </div>
        ) : null}
      </div>
    </div>
  );
}
