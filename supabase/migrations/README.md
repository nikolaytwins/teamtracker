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

## Реестр

| № | Файл | Описание |
|---|------|----------|
| 001 | `001_v2_core_schema.sql` | v2: workspace, projects, tasks, timer, activity |
| 002 | `002_v2_task_comments_links_subtasks.sql` | Комментарии, ссылки, scheduled_days |
| 003 | `003_v2_calendar_events.sql` | Календарь: события и заготовка интеграций |
| 004 | `004_v2_notifications_project_ink.sql` | Уведомления v2, color_ink у проектов |
| 005 | `005_v2_project_detail_assets.sql` | Договор, бюджет, links/files проекта |
| 006 | `006_v2_project_engagement_client_access.sql` | engagement_type, роли участников |
| 007 | `007_v2_task_planned_at.sql` | planned_at у задач |
| 008 | `008_v2_task_files_comment_replies.sql` | Файлы задач, ответы в комментариях |
| 009 | `009_v2_project_phases.sql` | Этапы проекта, phase_id у задач |
| 010 | *(удалена)* | Не использовать SQL-миграцию для очистки v2 — только `npm run v2-clear-projects` |
| 011 | `011_v2_attachments_storage_bucket.sql` | Supabase Storage bucket для файлов проектов и задач v2 |
| 012 | `012_avatars_storage_bucket.sql` | Supabase Storage bucket для аватаров |
| 013 | `013_v2_clients.sql` | CRM-клиенты v2 и привязка к проектам |
| 014 | `014_v2_project_kind_priority_paid.sql` | Вид проекта, приоритет, оплаченная сумма |
| 015 | `015_v2_project_completed_unpaid.sql` | Статус completed_unpaid |
| 016 | `016_v2_tasks_home_bucket.sql` | home_bucket у задач |
| 017 | `017_v2_finance.sql` | v2 «Проекты и финансы» (отдельно от v1 agency_*) |
| 018 | `018_v2_personal_finance.sql` | v2 «Личное» → личные финансы (счета, бюджет, налоги) |
| 019 | `019_v2_personal_todos.sql` | v2 «Личное» → личный планировщик задач |
| 020 | `020_v2_timer_unique_active.sql` | Один активный таймер на пользователя |
| 021 | `021_agency_general_expense_nullable_employee.sql` | NULL employee_name/role для произвольных общих расходов agency |
| 022 | `022_v2_personal_todo_priority_nullable.sql` | NULL priority = без приоритета у личных задач |
| 023 | `023_v2_task_personal_links.sql` | Связь задач проекта с личными todos, nullable priority у v2_tasks |
| 024 | `024_v2_leads.sql` | v2 админ-канбан лидов (статусы, тип агентство/курс) |

**Следующий свободный номер:** `025`

Очистка проектов v2 (без v1): `npm run v2-clear-projects` (опционально `DRY_RUN=1`). Таблицы `agency_*` и `pm_*` не затрагиваются.

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
