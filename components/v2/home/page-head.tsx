"use client";

import { V2Icons } from "@/components/v2/ui/icons";
import { formatDateLabel, greetingForHour } from "@/lib/v2/format";
import type { V2TaskWithMeta } from "@/lib/v2/types";
import { useState } from "react";

type Period = "day" | "week" | "month";

function pluralTasks(n: number): string {
  if (n === 1) return "задача";
  if (n >= 2 && n <= 4) return "задачи";
  return "задач";
}

export function PageHead({
  userName,
  tasks,
}: {
  userName: string;
  tasks: V2TaskWithMeta[];
}) {
  const [period, setPeriod] = useState<Period>("day");
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
    <div className="mb-6 flex items-end justify-between gap-6">
      <div>
        <div className="v2-tight text-[12.5px] font-medium text-[var(--v2-ink-500)]">{formatDateLabel()}</div>
        <h1 className="v2-tighter mt-1 text-[40px] font-semibold leading-[1.05] text-[var(--v2-ink-900)]">
          {greetingForHour()}, {firstName}
        </h1>
        <p className="v2-tight mt-2 max-w-[58ch] text-[14.5px] text-[var(--v2-ink-500)]">
          {summaryParts.join(" ")}.
          {urgentToday ? (
            <>
              {" "}
              Лучше начать с «{urgentToday.title}» — она самая срочная.
            </>
          ) : null}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1 rounded-xl bg-white/80 p-1 shadow-[var(--v2-shadow-card)] backdrop-blur lg:flex">
          {(
            [
              ["day", "День"],
              ["week", "Неделя"],
              ["month", "Месяц"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`v2-tight h-8 rounded-lg px-3 text-[12.5px] font-medium transition ${
                period === key
                  ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                  : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/80 px-3 text-[12.5px] text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] backdrop-blur transition hover:shadow-[var(--v2-shadow-cardHv)]"
        >
          <V2Icons.filter className="h-4 w-4 text-[var(--v2-ink-500)]" />
          Фильтр
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/80 px-3 text-[12.5px] text-[var(--v2-ink-700)] shadow-[var(--v2-shadow-card)] backdrop-blur transition hover:shadow-[var(--v2-shadow-cardHv)]"
        >
          <V2Icons.sort className="h-4 w-4 text-[var(--v2-ink-500)]" />
          Срок
        </button>
      </div>
    </div>
  );
}
