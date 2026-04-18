"use client";

import { ProfiAnalyticsSection } from "@/components/sales/profi-analytics-section";

export default function SalesAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Аналитика продаж</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Profi.ru — конверсии и экономика.</p>
      </div>

      <ProfiAnalyticsSection />
    </div>
  );
}
