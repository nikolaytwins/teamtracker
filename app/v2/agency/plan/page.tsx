import { DispatchPlanClient } from "@/components/v2/agency/plan/dispatch-plan-client";
import { Suspense } from "react";

export default function V2AgencyPlanPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[14px] text-[var(--v2-ink-400)]">Загрузка…</div>}>
      <DispatchPlanClient />
    </Suspense>
  );
}
