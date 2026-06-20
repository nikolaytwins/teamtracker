import { PersonalTodoViewClient } from "@/components/v2/personal/todos/personal-todo-view-client";

type Props = { params: Promise<{ id: string }> };

export default async function PersonalTaskProjectPage({ params }: Props) {
  const { id } = await params;
  return (
    <PersonalTodoViewClient
      view="project"
      projectId={id}
      title="Проект"
      subtitle="Задачи проекта"
      focusQuickAddOnMount
    />
  );
}
