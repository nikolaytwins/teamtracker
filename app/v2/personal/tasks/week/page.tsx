import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";

export default function PersonalTasksWeekPage() {
  return (
    <PersonalTodoViewClient
      view="week"
      title="Неделя"
      subtitle="Перетащите задачу на нужный день"
    />
  );
}
