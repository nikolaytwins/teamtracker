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
| 025 | `025_v2_leads_estimated_amount.sql` | Ориентировочная сумма у лидов |
| 026 | `026_v2_leads_awaiting_start_status.sql` | Статус лидов «Ожидает начала работы» |
| 027 | `027_v2_leads_source_and_taken_into_work.sql` | Источник лида и дата «взяли в работу» |
| 028 | `028_v2_personal_transactions_import.sql` | Импорт выписок: external_id / import_batch_id у транзакций |
| 029 | `029_v2_personal_forecast_expenses.sql` | Прогноз: expected_expenses_rub + доп. расходы месяца |
| 030 | `030_v2_personal_tax_patent.sql` | Налоги ИП на патенте (ПСН): patent_cost_rub, порог/ставка выручки |
| 031 | `031_v2_leads_taken_into_work_status.sql` | Статус лидов «Взято в работу» |
| 032 | `032_v2_personal_forecast_daily_spend.sql` | Прогноз: daily_spend_rub у бюджета месяца |
| 033 | `033_v2_personal_ideas.sql` | Личные идеи: стикеры, теги, фото |
| 034 | `034_v2_leads_lost_reason.sql` | Лиды: lost_reason + lost_at |
| 035 | `035_agency_project_business_line.sql` | Проекты и финансы: agency / impulse |
| 036 | `036_v2_personal_week_focus.sql` | Личный календарь: редактируемый фокус недели |
| 037 | `037_v2_week_focus_goal_priority.sql` | Фокус недели: приоритет целей |
| 038 | `038_v2_personal_ideas_corporate_colors.sql` | Идеи и заметки: корпоративная палитра |
| 039 | `039_v2_personal_fx_accounts.sql` | Личные финансы: валютные счета и курсы ЦБ |
| 040 | `040_v2_agency_work_kanban.sql` | Канбан работ агентства: work_status + внутренние карточки |
| 041 | `041_v2_strategy_pins.sql` | Стратегия: закреплённые фокусы месяцев |
| 042 | `042_v2_strategy2.sql` | Стратегия 2.0: цели, система, спринты, гипотезы, правила, решения, данные |
| 043 | `043_drop_v2_strategy2.sql` | Удаление Стратегии 2.0 (DROP v2_s2_*) |
| 044 | `044_agency_detail_hourly.sql` | Детализация: billing_type hourly + tracked_seconds; ставка часа на проекте |
| 045 | `045_v2_personal_wishes.sql` | Личные желания: карточки, категории, фото |
| 046 | `046_v2_personal_wish_categories.sql` | Желания: пользовательские категории |
| 047 | `047_v2_personal_life_docs.sql` | Личные разделы: время, бренд, стратегия сезона, мой код |
| 048 | `048_finance_business_line_qmagic.sql` | Проекты и финансы: направление qmagic |
| 049 | `049_v2_personal_observations.sql` | Личные наблюдения: записи и теги |
| 050 | `050_agency_project_tracked_time.sql` | Учёт времени с личного таймера на проекте (отдельно от сметы) |
| 051 | `051_agency_general_expense_business_line.sql` | Направление (agency/impulse/qmagic) у общих расходов |
| 052 | `052_v2_personal_finance_system.sql` | Финансовая система: очередь целей и стабильные расходы |
| 053 | `053_personal_account_in_cushion.sql` | Галочка «в подушку» у личного счёта |
| 054 | `054_v2_personal_wish_scale.sql` | Желания: масштаб (крайне важное / крупное / маленькое) и флаг «ближайшее» |
| 055 | `055_v2_personal_wish_scale_lifestyle.sql` | Желания: масштаб «лайфстайл» (выше остальных в ленте) |

**Следующий свободный номер:** `056`

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
