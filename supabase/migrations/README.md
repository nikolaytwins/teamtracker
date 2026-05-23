# Миграции Supabase

## Нумерация (с v2)

Новые миграции именуются **последовательно**:

```
001_kratkoe_opisanie.sql
002_...
003_...
```

- Трёхзначный префикс `001`–`999`, затем `_` и описание латиницей.
- Одна логическая правка схемы = один файл.
- SQL идемпотентный (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- В первой строке файла — комментарий с номером: `-- 001 — …`.

**Следующий свободный номер:** `005`

## Реестр

| № | Файл | Описание |
|---|------|----------|
| 001 | `001_v2_core_schema.sql` | v2: workspace, projects, tasks, timer, activity |
| 002 | `002_v2_task_comments_links_subtasks.sql` | Комментарии, ссылки, scheduled_days |
| 003 | `003_v2_calendar_events.sql` | Календарь: события и заготовка интеграций |
| 004 | `004_v2_notifications_project_ink.sql` | Уведомления v2, color_ink у проектов |

## Legacy (v1, до нумерации)

Файлы с префиксом `YYYYMMDDHHMMSS_` — схема v1 (agency, pm_board). Уже применены на проде; **не переименовывать** (ломает history в `supabase_migrations.schema_migrations`).

- `20260413120000_team_tracker_agency_core.sql`
- `20260414120000_agency_leads_archived.sql`
- `20260512180000_team_tracker_pm_board_history.sql`
- `20260512200000_pm_subtasks_description_priority_work_status.sql`

Если применяли `20260523120000_v2_core_schema.sql` — это то же, что **001**; повторный прогон 001 безопасен (идемпотентно).

## Применение

```bash
supabase db push
# или SQL Editor: по порядку 001, 002, …
```

Подробнее: [docs/SUPABASE-DATA-AND-MIGRATIONS.md](../docs/SUPABASE-DATA-AND-MIGRATIONS.md)
