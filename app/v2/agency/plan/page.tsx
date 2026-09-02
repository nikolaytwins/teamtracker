import { DispatchPagePlaceholder } from "@/components/v2/agency/dispatch/dispatch-page-placeholder";

export default function V2AgencyPlanPage() {
  return (
    <DispatchPagePlaceholder
      title="План"
      description="Диспетчер мощности: активные проекты, резерв, стратегия и Аркалиум. Данные уже доступны через API dispatch/context."
      apiHint="GET /api/v2/agency/dispatch/context?year=&month="
    />
  );
}
