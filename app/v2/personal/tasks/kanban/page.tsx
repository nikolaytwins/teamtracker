import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";

export default function PersonalTasksKanbanPage() {
  return (
    <PersonalTodoViewClient
      view="kanban"
      title="Канбан"
      subtitle="Перетащите задачу в колонку — Сегодня, Завтра, Неделя или Позже"
    />
  );
}
