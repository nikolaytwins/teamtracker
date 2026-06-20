import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";

export default function PersonalTasksUpcomingPage() {
  return (
    <PersonalTodoViewClient
      view="upcoming"
      title="Предстоящее"
      subtitle="Следующие 14 дней"
    />
  );
}
