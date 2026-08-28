"use client";

import "./ideas-tasks-design.css";
import { IdeasTasksFocusHero } from "@/components/v2/personal/ideas-tasks/ideas-tasks-focus-hero";
import { IdeasV3Panel } from "@/components/v2/personal/ideas-tasks/ideas-v3-panel";
import { TasksInboxPanel } from "@/components/v2/personal/ideas-tasks/tasks-inbox-panel";
import { PersonalTodoProvider } from "@/components/v2/personal/todos/personal-todo-context";
import { useWeekFocus } from "@/components/v2/personal/week-focus/use-week-focus";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "tasks" | "ideas";

export function IdeasTasksClient() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "ideas" ? "ideas" : "tasks";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekFocus = useWeekFocus(weekOffset);
  const [taskCount, setTaskCount] = useState(0);
  const [ideaCount, setIdeaCount] = useState(0);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "ideas" || t === "tasks") setTab(t);
  }, [searchParams]);

  return (
    <PersonalTodoProvider>
      <div className="ideas-tasks-v3 min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="page">
          <IdeasTasksFocusHero
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            weekFocus={weekFocus}
          />

          <div className="bar" style={{ marginBottom: 0 }}>
            <div className="tabs">
              <button type="button" className={`tab${tab === "tasks" ? " on" : ""}`} onClick={() => setTab("tasks")}>
                Задачи <b>{taskCount}</b>
              </button>
              <button type="button" className={`tab${tab === "ideas" ? " on" : ""}`} onClick={() => setTab("ideas")}>
                Идеи <b>{ideaCount}</b>
              </button>
            </div>
          </div>

          <div id="pane-tasks" style={{ display: tab === "tasks" ? "" : "none" }}>
            <TasksInboxPanel weekFocus={weekFocus} onCountChange={setTaskCount} />
          </div>

          <div id="pane-ideas" style={{ display: tab === "ideas" ? "" : "none" }}>
            <IdeasV3Panel onCountChange={setIdeaCount} />
          </div>
        </div>
      </div>
    </PersonalTodoProvider>
  );
}
