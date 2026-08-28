"use client";

import { IdeasV3Panel } from "@/components/v2/personal/ideas-tasks/ideas-v3-panel";
import { TasksInboxPanel } from "@/components/v2/personal/ideas-tasks/tasks-inbox-panel";
import { PersonalTodoProvider } from "@/components/v2/personal/todos/personal-todo-context";
import { useWeekFocus } from "@/components/v2/personal/week-focus/use-week-focus";
import { WeekFocusSection } from "@/components/v2/personal/week-focus/week-focus-section";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "tasks" | "ideas";

export function IdeasTasksClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "ideas" ? "ideas" : "tasks";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekFocus = useWeekFocus(weekOffset);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "ideas" || t === "tasks") setTab(t);
  }, [searchParams]);

  return (
    <PersonalTodoProvider>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--v2-ink-50)]">
        <div className="px-6 pt-6">
          <WeekFocusSection
            variant="hero"
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            weekFocusHook={weekFocus}
          />
        </div>

        <div className="sticky top-0 z-10 mt-6 border-b border-[var(--v2-ink-100)] bg-white px-6">
          <div className="flex gap-1 py-2">
            {(
              [
                ["tasks", "Задачи"],
                ["ideas", "Идеи"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  tab === key
                    ? "bg-[var(--v2-brand-50)] text-[var(--v2-brand-700)]"
                    : "text-[var(--v2-ink-600)] hover:bg-[var(--v2-ink-50)] hover:text-[var(--v2-ink-900)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-white">
          {tab === "tasks" ? <TasksInboxPanel weekFocus={weekFocus} /> : <IdeasV3Panel />}
        </div>
      </div>
    </PersonalTodoProvider>
  );
}
