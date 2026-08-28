import { IdeasTasksClient } from "@/components/v2/personal/ideas-tasks/ideas-tasks-client";
import { Suspense } from "react";

export default function PersonalIdeasTasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[14px] text-[var(--v2-ink-400)]">Загрузка…</div>}>
      <IdeasTasksClient />
    </Suspense>
  );
}
