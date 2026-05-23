import { Suspense } from "react";
import { V2KanbanClient } from "@/components/v2/kanban/kanban-client";

export default function V2KanbanPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>}>
      <V2KanbanClient />
    </Suspense>
  );
}
