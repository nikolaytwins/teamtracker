import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";

export default function PersonalTasksInboxPage() {
  return (
    <PersonalTodoViewClient
      view="inbox"
      title="Входящие"
      subtitle="Всё, что ещё не разложено по дням и проектам"
      focusQuickAddOnMount
    />
  );
}
