# Миграция v1 → v2 (вариант 3)

Скрипт переносит **только проекты** из v1 (`pm_cards` → `v2_projects`). Задачи в v2 создаются **вручную**; подзадачи — через `parent_id`.

Источник данных (по приоритету):

1. SQLite: `PM_BOARD_SQLITE_PATH` (на проде — `/root/.openclaw/workspace/agency-pm-board/data/pm-board.db`)
2. Supabase `pm_cards` (если SQLite не задан)

## Предварительно

1. Примените миграции Supabase **001**, **002**, **003**.
2. Задайте переменные окружения:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - опционально `V2_MIGRATE_ADMIN_USER_ID` (по умолчанию admin-пользователь v2)
   - `PM_BOARD_SQLITE_PATH` — путь к v1 SQLite (рекомендуется на проде)

## Запуск

```bash
# просмотр объёма без записи
DRY_RUN=1 PM_BOARD_SQLITE_PATH=/path/to/pm-board.db npm run v2-migrate-from-v1

# миграция (по умолчанию удаляет ошибочные v1t-* задачи от старого скрипта)
PM_BOARD_SQLITE_PATH=/path/to/pm-board.db npm run v2-migrate-from-v1

# не удалять старые v1t-* задачи
CLEAN_V1_TASKS=0 npm run v2-migrate-from-v1
```

## Идемпотентность

ID проектов с префиксом `v1p-` — повторный запуск безопасен (`upsert`). Задачи из v1 **не создаются**.

## Что не переносится

- `pm_subtasks` → v2 (подзадачи создаются вручную под задачей).
- `pm_time_entries` (отдельный шаг при необходимости).
- Комментарии и фазы v1.
- Agency / финансы — остаются в v1.
