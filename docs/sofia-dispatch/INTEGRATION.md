# Sofia dispatch — интеграция в TeamTracker

Надстройка поверх существующего раздела «Агентство». Финансовый источник правды — `agency_project` + `lib/v2/finance/finance-repo.ts`.

## Маршруты UI (заглушки до макета)

| Путь | Назначение |
|------|------------|
| `/v2/agency/plan` | Диспетчер мощности |
| `/v2/agency/rules` | Параметры правил |
| `/v2/agency/sofia` | Зеркало контекста для бота |

## API (admin session)

```
GET /api/v2/agency/dispatch/context?year=2026&month=9
GET /api/v2/agency/dispatch/rules
```

## API (Sophia, секрет)

```
GET /api/integrations/sophia/dispatch/context?year=2026&month=9
Header: x-tt-integration-secret: <TT_INTEGRATION_SECRET>
```

Ответ — тот же JSON, что и у admin endpoint: правила, финансы месяца (actual / reliable / planned profit), срез плана.

### План / календарь (чтение + запись)

```
GET    /api/integrations/sophia/plan?from=YYYY-MM-DD&to=YYYY-MM-DD&calendar=1
POST   /api/integrations/sophia/plan/items
PATCH  /api/integrations/sophia/plan/items/:id
DELETE /api/integrations/sophia/plan/items/:id
PATCH  /api/integrations/sophia/plan/day-mode
```

Тот же секрет. Доменный слой — `lib/v2/agency/plan/plan-repo.ts` (как веб `/api/v2/agency/plan/*`).
OpenClaw skill: `deploy/sophia-teamtracker-dispatch-skill/plan.py`.

## Доменный слой

```
lib/v2/agency/dispatch/
  dispatch-types.ts
  dispatch-work-status.ts
  dispatch-rules-defaults.ts
  dispatch-finance-summary.ts
  dispatch-repo.ts
  dispatch-context.ts
```

## Отделение от канбана

| Поле | Назначение |
|------|------------|
| `work_status` | Канбан «Все направления» |
| `dispatch_work_status` | Sofia Plan (planned → done) |

Старые проекты получают `dispatch_work_status = planned` по умолчанию (миграция 070).

## Миграция

Применить `070_agency_dispatch_foundation.sql` — колонки на `agency_project`, таблица `agency_dispatch_rules`.

До применения миграции API работает с дефолтными правилами из кода; новые колонки в ответах проектов будут отсутствовать и подставятся дефолты.

## Спека

Полная постановка: `docs/sofia-dispatch/00_README.md` и файлы 01–05.

## Следующие шаги

- Preview/confirm для переноса клиентского дедлайна и массового replan через integration API
- Создание agency_project из OpenClaw по явной команде
- UI polish по макету
