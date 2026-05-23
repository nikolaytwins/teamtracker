import { Suspense } from "react";
import { V2ProjectsClient } from "@/components/v2/projects/projects-client";

export default function V2ProjectsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>}>
      <V2ProjectsClient />
    </Suspense>
  );
}
