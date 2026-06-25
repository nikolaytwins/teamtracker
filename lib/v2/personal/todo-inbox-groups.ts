import type { PersonalTodoRow } from "@/lib/v2/personal/todo-types";
import type { V2TaskPriority } from "@/lib/v2/types";

export type InboxTodoSectionId = "urgent" | "high" | "low" | "unset";

export type InboxTodoSection = {
  id: InboxTodoSectionId;
  title: string;
  subtitle?: string;
  accent: string;
  priorities: V2TaskPriority[];
  todos: PersonalTodoRow[];
};

/** Входящие: срочные, высокие, низкие, нераспределённые (medium). */
export function groupInboxTodosByPriority(todos: PersonalTodoRow[]): InboxTodoSection[] {
  const urgent = todos.filter((t) => t.priority === "urgent");
  const high = todos.filter((t) => t.priority === "high");
  const low = todos.filter((t) => t.priority === "low");
  const unset = todos.filter((t) => t.priority === "medium");

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
      priorities: ["medium"],
      todos: unset,
    },
  ];

  return sections.filter((s) => s.todos.length > 0);
}

export const INBOX_IMPORTANT_SECTION_IDS: InboxTodoSectionId[] = ["urgent", "high"];
