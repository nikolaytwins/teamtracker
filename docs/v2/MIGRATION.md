# Миграция v1 → v2

Скрипт переносит данные из таблиц v1 (`pm_cards`, `pm_subtasks`, `pm_time_entries`) в v2 (`v2_projects`, `v2_tasks`, `v2_time_sessions`).

## Предварительно

1. Примените миграции Supabase **001**, **002**, **003**.
2. Убедитесь, что v1-данные уже в Supabase (`npm run import-team-to-supabase`).
3. Задайте переменные окружения:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - опционально `V2_MIGRATE_ADMIN_USER_ID` (по умолчанию `admin`)

## Запуск

```bash
# просмотр объёма без записи
DRY_RUN=1 npm run v2-migrate-from-v1

# миграция
npm run v2-migrate-from-v1
```

## Идемпотентность

ID записей с префиксами `v1p-`, `v1t-`, `v1s-` — повторный запуск безопасен (`upsert`).

## Что не переносится

- Комментарии и фазы v1 (можно добавить отдельным шагом).
- Agency / финансы — остаются в v1 до отдельной фазы.
- Личные проекты v2 создаются вручную в интерфейсе.
