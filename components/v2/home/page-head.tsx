"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { TaskViewSwitcher } from "@/components/v2/ui/task-view-switcher";
import { formatDateLabel, greetingForHour } from "@/lib/v2/format";
import type { TaskViewMode } from "@/lib/v2/task-view-mode";
import type { V2TaskWithMeta } from "@/lib/v2/types";

function pluralTasks(n: number): string {
  if (n === 1) return "задача";
  if (n >= 2 && n <= 4) return "задачи";
  return "задач";
}

export function PageHead({
  userName,
  tasks,
  view,
  setView,
}: {
  userName: string;
  tasks: V2TaskWithMeta[];
  view: TaskViewMode;
  setView: (view: TaskViewMode) => void;
}) {
  const firstName = userName.split(/\s+/)[0] ?? userName;
  const openToday = tasks.filter((t) => !t.completed_at && t.bucket === "today").length;
  const meetings = tasks.filter(
    (t) => !t.completed_at && t.bucket === "today" && /синк|встреч|дейли|созвон/i.test(t.title)
  ).length;
  const urgentToday = tasks.find((t) => !t.completed_at && t.priority === "urgent" && t.bucket === "today");

  const summaryParts = [
    `Сегодня у вас ${openToday} ${pluralTasks(openToday)}`,
    meetings > 0 ? `и ${meetings === 1 ? "одна встреча" : `${meetings} встречи`}` : null,
  ].filter(Boolean);

  return (
    <div className="mb-5 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <div className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-500)]">{formatDateLabel()}</div>
        <h1 className="v2-tighter mt-1 text-[28px] font-semibold leading-[1.1] text-[var(--v2-ink-900)] sm:text-[34px] lg:text-[40px] lg:leading-[1.05]">
          {greetingForHour()}, {firstName}
        </h1>
        <p className="v2-tight mt-2 max-w-[58ch] text-[14px] text-[var(--v2-ink-500)] sm:text-[14.5px]">
          {summaryParts.join(" ")}.
          {urgentToday ? (
            <>
              {" "}
              Лучше начать с «{urgentToday.title}» — она самая срочная.
            </>
          ) : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <TaskViewSwitcher view={view} setView={setView} />
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/80 px-3 text-[12.5px] max-sm:hidden text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] backdrop-blur transition hover:shadow-[var(--v2-shadow-cardHv)]"
        >
          <V2Icons.filter className="h-4 w-4 text-[var(--v2-ink-500)]" />
          Фильтр
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/80 px-3 text-[12.5px] max-sm:hidden text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] backdrop-blur transition hover:shadow-[var(--v2-shadow-cardHv)]"
        >
          <V2Icons.sort className="h-4 w-4 text-[var(--v2-ink-500)]" />
          Срок
        </button>
      </div>
    </div>
  );
}
