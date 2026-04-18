# Деплой через GitHub Actions

После каждого **push в `main`** (и при ручном запуске **Actions → Deploy → Run workflow**) job подключается к VPS по **SSH**, делает `git fetch` + `reset` на `origin/main`, `npm ci`, `npm run build` и `systemctl restart` сервиса.

## 1. Один раз на сервере

Как в [VPS-SETUP.md](./VPS-SETUP.md): клон в каталог (например `/opt/team-tracker`), первый `npm ci` / `build`, unit **systemd** (например `team-tracker`), nginx. На сервере должен быть **SSH-доступ** (ключ или пароль — ниже только ключ).

У пользователя, под которым заходит Actions, должны быть права на `git` в каталоге приложения и на `systemctl restart` (часто это **root** или пользователь в `sudoers` без пароля для этих команд).

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
| `DEPLOY_PATH` | `/opt/team-tracker` | Каталог с клоном репозитория на сервере |
| `DEPLOY_SYSTEMD_UNIT` | `team-tracker` | Имя unit для `systemctl restart` |
| `DEPLOY_BUILD_ROOT_DOMAIN` | `1` | `1` — сборка с `TEAM_TRACKER_ROOT_DOMAIN=1` (корень домена); любое другое значение — `npm run build` без этой переменной (сценарий с префиксом `/pm-board`) |

Переменные должны **совпадать** с тем, как у вас собрано приложение на сервере (см. unit и [VPS-SETUP.md](./VPS-SETUP.md)).

## 5. Проверка

1. Заполните секреты (минимум `DEPLOY_HOST` + `DEPLOY_SSH_KEY`).
2. Сделайте пустой коммит в `main` или **Run workflow** вручную.
3. Во вкладке **Actions** откройте последний **Deploy** и смотрите лог шага **SSH — обновление и перезапуск**.

Если шаг падает на `systemctl`, на сервере настройте права для пользователя SSH или укажите `DEPLOY_USER` с нужными sudo-правилами.

## 6. Защита ветки `main` (по желанию)

Можно включить **required status checks** только если добавите отдельный workflow CI (lint/tests); текущий workflow только деплоит и не блокирует merge сам по себе.

## 7. Частые сбои

### `Host key verification failed`

На первом запуске SSH может не доверять ключу хоста. Варианты:

- один раз с Mac выполнить `ssh user@host` и подтвердить fingerprint;
- либо в репозитории добавить секрет **`DEPLOY_SSH_KNOWN_HOSTS`** (одна строка из вывода `ssh-keyscan -H ваш_хост`) и расширить workflow отдельным шагом записи в `~/.ssh/known_hosts` на раннере **или** использовать [fingerprints](https://github.com/appleboy/ssh-action#fingerprints) у `appleboy/ssh-action`, если добавите соответствующий input.

### Приватный репозиторий GitHub

На сервере `git fetch` должен иметь доступ к GitHub: **Deploy key** (read-only) на репозиторий, добавленный в `~/.ssh` на сервере и `git remote` на `git@github.com:...`, либо другой способ (HTTPS + token в `credential.helper` и т.д.).

### `git reset --hard` стёр локальные правки на сервере

Так и задумано для предсказуемого CI: на сервере в каталоге приложения **не держите** незакоммиченные изменения; всё — через git.
