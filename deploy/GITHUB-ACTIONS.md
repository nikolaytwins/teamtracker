# Деплой через GitHub Actions

После каждого **push в `main`** (и при ручном запуске **Actions → Deploy → Run workflow**) раннер GitHub **собирает** приложение (`npm ci`, `npm run build` с `output: "standalone"`), упаковывает `.next/standalone` в архив и по **SCP** кладёт его на VPS. На сервере выполняются только **лёгкие** шаги: `git fetch` + `reset` на `origin/main`, распаковка в `.next/standalone`, при необходимости **однократная** правка unit systemd (с `npm run start` на `node server.js`) и `systemctl restart`. **На VPS не запускаются** `npm ci` и `npm run build` — это снимает нагрузку по RAM/CPU на слабом VPS.

## 1. Один раз на сервере

Как в [VPS-SETUP.md](./VPS-SETUP.md): клон в каталог (например `/opt/team-tracker`), unit **systemd** (например `team-tracker`), nginx, при необходимости первый запуск после первого успешного деплоя из Actions (каталог `.next/standalone` создаёт workflow). Ручная `npm ci` / `build` на сервере **не обязательны**, если вы обновляетесь только через этот workflow.

На сервере должен быть **SSH-доступ** по ключу. У пользователя, под которым заходит Actions, должны быть права на `git` в каталоге приложения и на `systemctl restart` (часто **root** или пользователь в `sudoers` без пароля для этих команд).

**SQLite:** в unit для режима standalone `WorkingDirectory` указывает на `…/проект/.next/standalone`, поэтому пути к базам должны быть **абсолютные** (например `Environment=AGENCY_SQLITE_PATH=/opt/team-tracker/data/agency.db`), а не относительный только `data/…` от корня репо — см. [team-tracker.vps.example.service](./team-tracker.vps.example.service).

## 2. Deploy key или отдельный ключ только для CI

Рекомендуется **отдельный** SSH-ключ только для деплоя (не ваш личный):

```bash
ssh-keygen -t ed25519 -f ./gha-team-tracker-deploy -N "" -C "github-actions-team-tracker"
```

- Содержимое **`gha-team-tracker-deploy.pub`** добавьте на сервер в `~/.ssh/authorized_keys` пользователя деплоя (например `root` или `deploy`).
- Содержимое **`gha-team-tracker-deploy`** (приватный ключ, целиком с `BEGIN` / `END`) вставьте в GitHub в секрет **`DEPLOY_SSH_KEY`**.

Репозиторий на GitHub должен быть доступен серверу для `git fetch` (обычно репо **public** или на сервере настроен deploy key / credential для `git@github.com:...`).

## 3. Секреты репозитория

**Settings → Secrets and variables → Actions → Secrets → New repository secret**

| Секрет | Обязательно | Описание |
|--------|-------------|----------|
| `DEPLOY_HOST` | да | IP или hostname VPS (например `178.72.168.156`) |
| `DEPLOY_SSH_KEY` | да | Приватный SSH-ключ (PEM / OpenSSH), многострочный |
| `DEPLOY_USER` | нет | Логин SSH; если не задан — используется **`root`** |
| `DEPLOY_SSH_PORT` | нет | Порт SSH; если не задан — **22** |

## 4. Переменные репозитория (не секреты)

**Settings → Secrets and variables → Actions → Variables**

| Переменная | По умолчанию | Смысл |
|------------|--------------|--------|
| `DEPLOY_PATH` | `/opt/team-tracker` | **Абсолютный путь на сервере**, где лежит клон (`git clone`). Если проект в другом месте — задайте переменную (иначе будет ошибка «нет каталога»). |
| `DEPLOY_SYSTEMD_UNIT` | `team-tracker` | Имя unit для `systemctl restart` |
| `DEPLOY_BUILD_ROOT_DOMAIN` | `1` | `1` — сборка на раннере с `TEAM_TRACKER_ROOT_DOMAIN=1` (корень домена); любое другое значение — `npm run build` **без** этой переменной (сценарий с префиксом `/pm-board`) |

Переменная `DEPLOY_BUILD_ROOT_DOMAIN` должна **совпадать** с тем, как у вас задано в systemd (`TEAM_TRACKER_ROOT_DOMAIN` в unit или в `EnvironmentFile`), см. [VPS-SETUP.md](./VPS-SETUP.md).

## 5. Проверка

1. Заполните секреты (минимум `DEPLOY_HOST` + `DEPLOY_SSH_KEY`).
2. Сделайте пустой коммит в `main` или **Run workflow** вручную.
3. Во вкладке **Actions** откройте последний **Deploy** и смотрите логи шагов **Сборка**, **Загрузка архива**, **Распаковка и перезапуск**.

Если шаг падает на `systemctl`, на сервере настройте права для пользователя SSH или укажите `DEPLOY_USER` с нужными sudo-правилами.

## 6. Защита ветки `main` (по желанию)

Можно включить **required status checks** только если добавите отдельный workflow CI (lint/tests); текущий workflow только деплоит и не блокирует merge сам по себе.

## 7. Частые сбои

### `Host key verification failed`

На шаге **SCP** раннер добавляет хост в `known_hosts` через `ssh-keyscan`. Если хост менял ключ — обновите fingerprint вручную или перезапустите workflow после первого успешного `ssh-keyscan`.

### Приватный репозиторий GitHub

На сервере `git fetch` должен иметь доступ к GitHub: **Deploy key** (read-only) на репозиторий, добавленный в `~/.ssh` на сервере и `git remote` на `git@github.com:...`, либо другой способ (HTTPS + token в `credential.helper` и т.д.).

### `Нет каталога ... DEPLOY_PATH`

На сервере **нет** каталога по умолчанию `/opt/team-tracker`. Варианты:

1. **Создать и клонировать** (как в [VPS-SETUP.md](./VPS-SETUP.md)):

```bash
sudo mkdir -p /opt && sudo git clone git@github.com:USER/team-tracker.git /opt/team-tracker
```

(подставьте свой URL репозитория.)

2. Либо в GitHub → **Variables** задать **`DEPLOY_PATH`** = путь, где у вас **уже** лежит проект.

### После деплоя пустые данные / не та база

Проверьте в unit **абсолютные** `AGENCY_SQLITE_PATH` и `PM_BOARD_SQLITE_PATH` на каталог **клона** (родитель `.next/standalone`), не на внутреннюю папку standalone.

### `git reset --hard` стёр локальные правки на сервере

Так и задумано для предсказуемого CI: на сервере в каталоге приложения **не держите** незакоммиченные изменения; всё — через git.
