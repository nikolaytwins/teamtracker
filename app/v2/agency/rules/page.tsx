import { DispatchPagePlaceholder } from "@/components/v2/agency/dispatch/dispatch-page-placeholder";

export default function V2AgencyRulesPage() {
  return (
    <DispatchPagePlaceholder
      title="Правила"
      description="Параметры мощности, резерва, ставок и финансовых порогов. Сейчас читаются из agency_dispatch_rules с fallback на дефолты в коде."
      apiHint="GET /api/v2/agency/dispatch/rules"
    />
  );
}
