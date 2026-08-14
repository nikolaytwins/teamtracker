import { V2AdminLeadsClient } from "@/components/v2/admin/leads-client";
import { Suspense } from "react";

export default function V2AdminLeadsProfiAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
      }
    >
      <V2AdminLeadsClient initialTab="profi-analytics" />
    </Suspense>
  );
}
