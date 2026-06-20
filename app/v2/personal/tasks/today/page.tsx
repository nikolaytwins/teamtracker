import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";

export default function PersonalTasksTodayPage() {
  return (
    <PersonalTodoViewClient
      view="today"
      title="Сегодня"
      subtitle="Фокус на текущий день"
      focusQuickAddOnMount
    />
  );
}
