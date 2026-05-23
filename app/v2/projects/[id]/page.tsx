import { Suspense } from "react";
import { ProjectDetailClient } from "@/components/v2/project-detail/project-detail-client";

export default async function V2ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>}>
      <ProjectDetailClient projectId={id} />
    </Suspense>
  );
}
