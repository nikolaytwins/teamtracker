import { DispatchPagePlaceholder } from "@/components/v2/agency/dispatch/dispatch-page-placeholder";

export default function V2AgencySofiaPage() {
  return (
    <DispatchPagePlaceholder
      title="София"
      description="Зеркало контекста для Telegram-бота: те же расчёты прибыли и плана, что и в веб-интерфейсе."
      apiHint="GET /api/integrations/sophia/dispatch/context?year=&month="
    />
  );
}
