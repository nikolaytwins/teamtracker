# OpenClaw: Team Tracker dispatch (Telegram / VK)

Skill в репозитории: `deploy/sophia-teamtracker-dispatch-skill/`.

## Быстрая установка на VPS (178.72.168.156)

С Mac (из корня репозитория):

```bash
scp -r deploy/sophia-teamtracker-dispatch-skill root@178.72.168.156:/tmp/
ssh root@178.72.168.156 'bash /tmp/sophia-teamtracker-dispatch-skill/install.sh'
```

## Проверка

```bash
ssh root@178.72.168.156 \
  'python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/dispatch.py | head -25'
```

Ожидается блок `DISPATCH CONTEXT` с прибылью и проектами.  
`ERROR: API 401` — секрет в `/etc/team-tracker.env` не совпадает с Team Tracker.

## Секрет

На VPS Team Tracker и OpenClaw используют один секрет:

```bash
# /etc/team-tracker.env
TT_INTEGRATION_SECRET=...   # мин. 16 символов
```

Тот же ключ в env деплоя `tt.twinlabs.ru`.

## Как пользоваться в Telegram / VK

1. Напиши `@sofilorebot` (или ВК-бот) как обычно.
2. Вопросы про проект / цену / срок / загрузку → София **должна** вызвать `dispatch.py`.
3. Явная команда «добавь в план / перенеси / поставь стратегию» → `plan.py` (запись в календарь).
4. Ответ — текстом в формате: решение → запасной → почему → клиенту.

Примеры:

- «Лендинг 35k, 10 часов, до 12 сентября — брать?»
- «Можно брать новый проект?»
- «Что делать сейчас?»
- «Перестроить план»
- «Добавь в план Автосайт на среду, 4 часа»
- «Поставь стратегию на четверг»

Красивые карточки — только на сайте: `/v2/agency/sofia`.

## Write API (секрет, как у diary)

```
GET    /api/integrations/sophia/plan?from=&to=&calendar=1
POST   /api/integrations/sophia/plan/items
PATCH  /api/integrations/sophia/plan/items/:id
DELETE /api/integrations/sophia/plan/items/:id
PATCH  /api/integrations/sophia/plan/day-mode
```

Header: `x-tt-integration-secret: <TT_INTEGRATION_SECRET>`

## Workspace-файлы OpenClaw

После установки skill обновите (если ещё нет):

- `TOOLS.md` — секция Team Tracker dispatch
- при необходимости `AGENTS.md` — напоминание вызывать skill

Полные инструкции модели: `docs/sofia-dispatch/04_SOFIA_OPENCLAW_INSTRUCTIONS.md`.

## API

```
GET https://tt.twinlabs.ru/api/integrations/sophia/dispatch/context?year=2026&month=3
Header: x-tt-integration-secret: <TT_INTEGRATION_SECRET>
```

## Отличие от дневника

| Skill | Назначение |
|-------|------------|
| `teamtracker-diary` | Записи в личный дневник (`#теги`, `дневник:`) |
| `teamtracker-dispatch` | Чтение плана/денег/проектов для решений |
