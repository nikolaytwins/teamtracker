# Team Tracker

Канбан проектов (ПМ) и раздел **Агентство** (проекты, лиды, Profi.ru, статистика) в одном приложении под префиксом `/pm-board`.

## Базы SQLite

- **Канбан:** `data/pm-board.db` — карточки `pm_cards`.
- **Агентство и история:** `data/agency.db` — таблицы Twinworks-агентства (копия схемы из `prisma/schema.prisma` в репозитории для справки).

При первом запуске скопируйте продовый/локальный `dev.db` в `data/agency.db` или задайте путь: `AGENCY_SQLITE_PATH=/path/to/file.db`.

## Запуск

- Порт по умолчанию: **3003** (`npm run dev` / `npm start`).
- `NEXT_PUBLIC_BASE_PATH` задаётся в `next.config.ts` (сейчас `/pm-board`).

## API канбана

- `GET /pm-board/api/cards`
- `PATCH /pm-board/api/cards/:id`

Синхронизация канбана с агентством: `POST /pm-board/api/cards/sync-from-agency` (читает проекты из локального `data/agency.db`).

## Деплой

- Пример unit: `deploy/agency-pm-board.service` (при переименовании сервиса обновите файл и nginx).
