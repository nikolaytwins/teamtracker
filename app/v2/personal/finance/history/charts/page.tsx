import { Suspense } from "react";
import { PersonalIncomeHistoryChartsFullClient } from "@/components/v2/personal/finance/personal-income-history-charts-full";

export default function PersonalIncomeHistoryChartsFullPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[var(--v2-ink-500)]">Загрузка…</div>
      }
    >
      <PersonalIncomeHistoryChartsFullClient />
    </Suspense>
  );
}
