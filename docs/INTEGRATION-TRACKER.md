# Team Tracker — трекер интеграции (живой чеклист)

Файл в репозитории, чтобы не дублировать работу между сессиями. **Обновляйте чекбоксы** по мере merge в основную ветку.

Легенда: `[x]` сделано, `[ ]` в планах / частично.

## Роли и доступ

- [x] Опционально: вход через Supabase (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `auth_email` или логин-email, `PATCH /api/admin/users/:id`), сессия приложения по-прежнему `tt_session`
- [x] Роли `admin` | `designer` | `pm` в БД и сессии
- [x] Middleware: ограничение `/agency`, `/sales`, `/admin`, соответствующих API
- [x] Админка пользователей: `/admin/users`, API `GET/PATCH` для ролей
- [x] Пункт навигации «Команда» для админов

## Таймер и профиль `/me`

- [x] `worker_user_id` на `pm_time_entries`, привязка к сессии
- [x] Виртуальная карточка «Другое», `GET /api/cards/active`
- [x] Типы задач (`time-task-types`, пресеты по типу проекта)
- [x] Неделя сессий, «Продолжить», аналитика месяца с матчем по пользователю
- [x] Блок «Мои подзадачи» + `GET /api/me/subtasks` + быстрый старт таймера
- [x] Массовый backfill `worker_user_id` из исторических `worker_name`: `npm run backfill-worker-user-id` (флаг `--dry-run`)

## Подзадачи и прогресс

- [x] Таблица `pm_subtasks`, CRUD, API под карточкой
- [x] Модалка канбана: список, роли, прогресс на карточке (`derivedSubtaskProgress`)
- [x] `GET /api/team/users` для выбора исполнителя/лида

## Согласования и уведомления

- [x] `approval_waiting_since` при входе в статусы согласования (сброс при выходе)
- [x] Таблица `tt_notifications`, назначение на подзадачу (`subtask_assigned`)
- [x] Напоминание админам о простое согласования ≥48ч (`approval_stale`, дедуп 24ч)
- [x] Колокол в шапке, `GET/PATCH /api/me/notifications`
- [ ] Отдельная страница / полный центр уведомлений (если понадобится)

## Agency / данные / календарь (крупные куски)

- [x] Единый store Agency (`getAgencyRepo()` в `lib/agency-store/`, SQLite + Supabase) — все `app/api/agency/**`, маржа и sync-from-agency; cutover: `AGENCY_DATABASE=supabase` + ключи + импорт
- [x] Lead → project, импорт, синхронизация (SQLite-ветка: `source_lead_id`, `POST /api/agency/leads/[id]/convert`, ссылки лид↔проект↔карточка)
- [x] Календарь (`/board/calendar`, `GET /api/board/calendar`, фильтры по сотруднику/проекту)
- [x] Нагрузка команды / маржа (`/board/team-load`, `GET /api/time-analytics/team-week`, `GET /api/agency/margin/by-worker`)
- [x] Расширенная аналитика карточки проекта (`/board/[cardId]`: блоки по дням и типам задач, фильтры и логи с заметкой)
- [x] AppShell, темы (правый сайдбар desktop + mobile drawer, light/dark toggle, единый shell в `me/board/agency/sales/admin`)

---

**Для агента:** после значимого шага обновляйте этот файл в том же PR/коммите, что и код.
