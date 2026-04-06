# Team Tracker

Канбан проектов (ПМ) и раздел **Агентство** (проекты, лиды, Profi.ru, статистика).

## Базы SQLite

- **Канбан:** `data/pm-board.db` — карточки `pm_cards`.
- **Агентство и история:** `data/agency.db` — те же таблицы, что в Twinworks `prisma/dev.db`.

Подтянуть данные с **продакшена** (после `ssh`):

```bash
./scripts/sync-agency-db-from-production.sh
./scripts/sync-pm-board-from-production.sh   # опционально, канбан с сервера pm-board
```

С **локального** Twinworks:

```bash
./scripts/sync-agency-db-from-twinworks-repo.sh
# или TWINWORKS_DEV_DB=/путь/к/dev.db ./scripts/sync-agency-db-from-twinworks-repo.sh
```

Либо `AGENCY_SQLITE_PATH=/path/to/dev.db` без копирования.

Канбан: `PM_BOARD_SQLITE_PATH=/path/to/pm-board.db` — иначе используется `data/pm-board.db`.

На странице **Проекты** таблица по умолчанию открывается на **месяце последнего созданного проекта** (фильтр по `createdAt`). Статистика без этого фильтра — поэтому раньше могло казаться, что «цифры есть, а таблица пустая».

## Запуск

- Порт: **3003** (`npm run dev` / `npm start`).

### Префикс `/pm-board` (как сейчас за nginx на одном домене)

По умолчанию `basePath: /pm-board`. Клиентский `NEXT_PUBLIC_BASE_PATH` задаётся при сборке из `next.config.ts`.

### Поддомен `https://tt.twinlabs.ru/` (без префикса)

1. Сборка: `TEAM_TRACKER_ROOT_DOMAIN=1 npm run build`
2. В systemd (или `.env` перед `npm start`): `TEAM_TRACKER_ROOT_DOMAIN=1`
3. Nginx: см. `deploy/nginx-tt.twinlabs.ru.conf.example`, unit — `deploy/team-tracker-root.service.example` (порт `3005` можно поменять).

## API канбана (с префиксом)

- `GET /pm-board/api/cards`
- `PATCH /pm-board/api/cards/:id`

В режиме корня поддомена пути без префикса: `/api/cards`, `/board`, `/agency`.

Синхронизация канбана с агентством: `POST …/api/cards/sync-from-agency`.

## Деплой

- Старый пример под `/pm-board`: `deploy/agency-pm-board.service`.
