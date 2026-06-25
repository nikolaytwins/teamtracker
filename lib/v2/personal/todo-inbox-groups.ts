import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";

export type InboxTodoSectionId = "urgent" | "high" | "medium" | "low" | "unset";

export type InboxTodoSection = {
  id: InboxTodoSectionId;
  title: string;
  subtitle?: string;
  accent: string;
  priorities: (V2TaskPriority | null)[];
  todos: PersonalTodoRow[];
};

/** Входящие: срочные, высокие, средние, низкие, без приоритета (NULL). */
export function groupInboxTodosByPriority(todos: PersonalTodoRow[]): InboxTodoSection[] {
  const urgent = todos.filter((t) => t.priority === "urgent");
  const high = todos.filter((t) => t.priority === "high");
  const medium = todos.filter((t) => t.priority === "medium");
  const low = todos.filter((t) => t.priority === "low");
  const unset = todos.filter((t) => !t.priority);

  const sections: InboxTodoSection[] = [
    {
      id: "urgent",
      title: "Срочные",
      accent: "#EF4444",
      priorities: ["urgent"],
      todos: urgent,
    },
    {
      id: "high",
      title: "Высокий приоритет",
      accent: "#F97316",
      priorities: ["high"],
      todos: high,
    },
    {
      id: "medium",
      title: "Средний приоритет",
      accent: "#3B6FF7",
      priorities: ["medium"],
      todos: medium,
    },
    {
      id: "low",
      title: "Низкий приоритет",
      subtitle: "Можно сделать, когда освободится время",
      accent: "#22C55E",
      priorities: ["low"],
      todos: low,
    },
    {
      id: "unset",
      title: "Нераспределённые",
      subtitle: "Без явного приоритета — разберите позже",
      accent: "#A1A1AA",
      priorities: [null],
      todos: unset,
    },
  ];

  return sections.filter((s) => s.todos.length > 0);
}

export const INBOX_IMPORTANT_SECTION_IDS: InboxTodoSectionId[] = ["urgent", "high"];
