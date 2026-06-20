import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";

export default function PersonalTasksCompletedPage() {
  return (
    <PersonalTodoViewClient
      view="completed"
      title="Выполненные"
      subtitle="Последние 100 закрытых задач"
    />
  );
}
