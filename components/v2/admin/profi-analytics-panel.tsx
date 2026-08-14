"use client";

import { ProfiAnalyticsSection } from "@/components/sales/profi-analytics-section";

/** Аналитика Profi.ru во вкладке Лиды (данные из Supabase v2). */
export function ProfiAnalyticsPanel() {
  return <ProfiAnalyticsSection apiPath="/api/v2/agency/profi-responses" />;
}
