"use client";

import { PersonalIdeasClient } from "@/components/v2/personal/ideas/personal-ideas-client";
import { PersonalTodoProvider } from "@/components/v2/personal/todos/personal-todo-context";
import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";
import { V2Icons } from "@/components/v2/ui/icons";
import { useState } from "react";

type Tab = "tasks" | "ideas";
type TaskMode = "inbox" | "kanban";

const TASK_MODES: { key: TaskMode; label: string; icon: keyof typeof V2Icons }[] = [
  { key: "inbox", label: "Список", icon: "list" },
  { key: "kanban", label: "Канбан", icon: "kanban" },
];

const TASK_MODE_META: Record<TaskMode, { title: string; subtitle: string }> = {
  inbox: {
    title: "Задачи",
    subtitle: "Всё, что ещё не разложено по дням и проектам",
  },
  kanban: {
    title: "Задачи",
    subtitle: "Перетащите задачу в колонку — Сегодня, Завтра, Неделя или Позже",
  },
};

function TaskModeSwitch({ mode, onChange }: { mode: TaskMode; onChange: (m: TaskMode) => void }) {
  return (
    <div className="inline-flex items-center rounded-full bg-white p-1 shadow-[var(--v2-shadow-card)]">
      {TASK_MODES.map((m) => {
        const Icon = V2Icons[m.icon];
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            className={`v2-tight inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition ${
              active
                ? "bg-[var(--v2-ink-900)] text-white"
                : "text-[var(--v2-ink-600)] hover:text-[var(--v2-ink-900)]"
            }`}
            title={m.key === "kanban" ? "Показать задачи канбаном" : "Показать задачи списком"}
          >
            <Icon className="h-4 w-4" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

export function IdeasTasksClient() {
  const [tab, setTab] = useState<Tab>("tasks");
  const [taskMode, setTaskMode] = useState<TaskMode>("inbox");

  return (
    <PersonalTodoProvider>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[var(--v2-ink-100)] bg-white px-6">
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

        {tab === "tasks" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PersonalTodoViewClient
              key={taskMode}
              view={taskMode}
              title={TASK_MODE_META[taskMode].title}
              subtitle={TASK_MODE_META[taskMode].subtitle}
              headerRight={<TaskModeSwitch mode={taskMode} onChange={setTaskMode} />}
            />
          </div>
        ) : (
          <PersonalIdeasClient />
        )}
      </div>
    </PersonalTodoProvider>
  );
}
