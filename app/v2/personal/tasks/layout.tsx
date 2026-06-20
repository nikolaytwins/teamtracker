import { PersonalTodoPlannerShell } from "@/components/v2/personal/todos/personal-todo-planner-shell";

export default function PersonalTasksLayout({ children }: { children: React.ReactNode }) {
  return <PersonalTodoPlannerShell>{children}</PersonalTodoPlannerShell>;
}
