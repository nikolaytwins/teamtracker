import type { V2TaskPriority } from "@/lib/v2/types";

export type ProjectInboxSectionId = "urgent" | "high" | "medium" | "low" | "unset";

export type ProjectInboxSection<T extends { priority: V2TaskPriority | null }> = {
  id: ProjectInboxSectionId;
  title: string;
  subtitle?: string;
  accent: string;
  priorities: (V2TaskPriority | null)[];
  todos: T[];
};

/** Входящие проекта: срочные → высокие → средние → низкие → нераспределённые (NULL). */
export function groupProjectInboxByPriority<T extends { priority: V2TaskPriority | null }>(
  todos: T[]
): ProjectInboxSection<T>[] {
  const urgent = todos.filter((t) => t.priority === "urgent");
  const high = todos.filter((t) => t.priority === "high");
  const medium = todos.filter((t) => t.priority === "medium");
  const low = todos.filter((t) => t.priority === "low");
  const unset = todos.filter((t) => !t.priority);

  const sections: ProjectInboxSection<T>[] = [
    { id: "urgent", title: "Срочные", accent: "#EF4444", priorities: ["urgent"], todos: urgent },
    { id: "high", title: "Высокий приоритет", accent: "#F97316", priorities: ["high"], todos: high },
    { id: "medium", title: "Средний приоритет", accent: "#3B6FF7", priorities: ["medium"], todos: medium },
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
      subtitle: "Бэклог — без явного приоритета",
      accent: "#A1A1AA",
      priorities: [null],
      todos: unset,
    },
  ];

  return sections.filter((s) => s.todos.length > 0);
}

export const PROJECT_INBOX_IMPORTANT_IDS: ProjectInboxSectionId[] = ["urgent", "high"];
