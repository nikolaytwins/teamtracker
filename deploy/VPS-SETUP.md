# Деплой Team Tracker на VPS (178.72.168.156 и любой другой)

Пошагово: **GitHub → push → сервер → сборка → systemd → nginx**. Если что-то падает, смотрите раздел «Частые ошибки» внизу.

## Часть 1. Репозиторий на GitHub (с вашего Mac)

### 1.1. Указать имя и почту в Git (один раз)

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "you@example.com"
```

### 1.2. Создать репозиторий на GitHub

1. Зайти на [github.com/new](https://github.com/new).
2. Имя, например `team-tracker`, **без** README (репозиторий пустой).
3. Создать.

### 1.3. Привязать remote и запушить

В папке проекта на Mac:

```bash
cd /path/to/team-tracker
git remote add origin git@github.com:ВАШ_ЛОГИН/team-tracker.git
# если SSH ещё не настроен — см. раздел «SSH для GitHub» ниже
git branch -M main
git push -u origin main
```

Если `remote origin already exists` — сначала `git remote remove origin`, потом снова `add`.

### 1.4. SSH для GitHub (если push просит пароль или не коннектится)

На Mac:

```bash
ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519_github -N ""
cat ~/.ssh/id_ed25519_github.pub
```

Скопировать ключ в GitHub → **Settings → SSH and GPG keys → New SSH key**.

В `~/.ssh/config`:

```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
```

Проверка: `ssh -T git@github.com`.

---

## Часть 2. Сервер (SSH `root@178.72.168.156`)

### 2.1. Зайти по SSH

```bash
ssh root@178.72.168.156
```

Рекомендуется ключ вместо пароля: на Mac `ssh-copy-id root@178.72.168.156` (если настроен).

### 2.2. Node.js 20+ (обязательно для Next 16)

Проверка: `node -v` — нужно **v20** или новее.

Если нет или старая версия (Debian/Ubuntu):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential
```

Пакет `build-essential` нужен для нативного модуля `better-sqlite3`.

### 2.3. Клонировать репозиторий

Выберите каталог, например `/opt/team-tracker`:

```bash
mkdir -p /opt
cd /opt
git clone git@github.com:ВАШ_ЛОГИН/team-tracker.git
cd team-tracker
```

На сервере тоже нужен **SSH-ключ с доступом к GitHub** (отдельный deploy key или ваш личный):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Ключ добавить в GitHub → репозиторий → **Settings → Deploy keys** (только read достаточно) или в аккаунт.

### 2.4. Данные SQLite

В репозитории в `.gitignore` лежат `*.db` — базы **не** в git. На сервере:

```bash
mkdir -p /opt/team-tracker/data
```

При первом запуске приложение создаст файлы в `data/`, либо скопируйте свои `agency.db` и `pm-board.db` в `data/` (через `scp` с Mac).

Если агентство всё ещё в другом проекте (Twinworks), можно задать путь:

```bash
export AGENCY_SQLITE_PATH=/путь/к/dev.db
export PM_BOARD_SQLITE_PATH=/путь/к/pm-board.db
```

Иначе по умолчанию: `data/agency.db` и `data/pm-board.db` в каталоге приложения.

### 2.5. Сборка

**Вариант C (рекомендуется на слабом VPS)** — только **[GitHub Actions](GITHUB-ACTIONS.md)**: сборка идёт на раннере GitHub, на сервер уезжает готовый архив standalone; на VPS не нужны `npm ci` / `npm run build`. Достаточно клона, systemd и nginx.

**Вариант A — сайт с корня домена** (как `tt.twinlabs.ru`, без `/pm-board`), сборка **вручную на сервере или локально**:

```bash
cd /opt/team-tracker
npm ci
TEAM_TRACKER_ROOT_DOMAIN=1 npm run build
```

**Вариант B — приложение за nginx по пути `/pm-board`:**

```bash
cd /opt/team-tracker
npm ci
npm run build
```

Важно: режим `TEAM_TRACKER_ROOT_DOMAIN` должен **совпадать** при `npm run build` и при запуске (те же переменные в systemd и в переменной **`DEPLOY_BUILD_ROOT_DOMAIN`** в GitHub, если деплоите через Actions).

### 2.6. systemd

Скопировать пример и поправить пути:

Секреты и флаги (один раз): скопируйте `deploy/team-tracker.env.example` → `/etc/team-tracker.env`, выставьте `chmod 600`, подставьте `TEAM_TRACKER_AUTH_SECRET` и при необходимости `TEAM_TRACKER_USERS_JSON`. В примере уже включено **`TEAM_TRACKER_SELF_REGISTER=1`** (форма регистрации на `/login`). Unit-файл ниже подключает этот файл через `EnvironmentFile=-/etc/team-tracker.env`.

```bash
cp /opt/team-tracker/deploy/team-tracker.vps.example.service /etc/systemd/system/team-tracker.service
nano /etc/systemd/system/team-tracker.service
# проверить WorkingDirectory (для Actions: …/.next/standalone), ExecStart (node server.js), абсолютные пути к SQLite, User, PORT, TEAM_TRACKER_ROOT_DOMAIN
systemctl daemon-reload
systemctl enable team-tracker
systemctl start team-tracker
systemctl status team-tracker
```

Логи при падении:

```bash
journalctl -u team-tracker -n 80 --no-pager
journalctl -u team-tracker -f
```

### 2.7. Nginx

- Корень домена: см. `deploy/nginx-tt.twinlabs.ru.conf.example` (прокси на `PORT` из unit, по умолчанию **3005**).
- Префикс `/pm-board`: в конфиге основного сайта нужен `location /pm-board/` → `proxy_pass http://127.0.0.1:ПОРТ/pm-board/;` (порт тот же, что в `PORT`).

После правок: `nginx -t && systemctl reload nginx`.

---

## Обновление после правок

Обычно достаточно **push в `main`**: workflow из **[GITHUB-ACTIONS.md](./GITHUB-ACTIONS.md)** сам собирает проект на GitHub и обновляет только артефакт на VPS (без тяжёлой сборки на сервере).

Ручной деплой на сервере (если Actions не используете):

```bash
cd /opt/team-tracker
git pull origin main
npm ci
# тот же режим, что при первой сборке:
TEAM_TRACKER_ROOT_DOMAIN=1 npm run build   # или без переменной для /pm-board
systemctl restart team-tracker
```

### Автодеплой из GitHub Actions

После настройки секретов и переменных каждый **push в `main`** обновляет сервер: `git reset` на `origin/main`, распаковка standalone, `systemctl restart`. Полная инструкция: **[deploy/GITHUB-ACTIONS.md](./GITHUB-ACTIONS.md)**.

---

## Частые ошибки

| Симптом | Что проверить |
|--------|----------------|
| `Module not found` / ошибки импорта | При ручной сборке на сервере: `npm ci` после `git pull`. При деплое через Actions сборка на раннере — на VPS проверьте, что последний workflow прошёл успешно. |
| Падает на `better-sqlite3` | Только для ручной сборки на VPS: `build-essential`, `rm -rf node_modules && npm ci`. Через Actions нативный модуль собирается на раннере Ubuntu. |
| 502 Bad Gateway | `systemctl status team-tracker`, процесс слушает `PORT` из unit; nginx `proxy_pass` на тот же порт. |
| Страница без стилей / битые ссылки | Несовпадение `basePath`: в GitHub задать **`DEPLOY_BUILD_ROOT_DOMAIN`** так же, как `TEAM_TRACKER_ROOT_DOMAIN` в systemd, и перезапустить деплой. |
| `npm run build` убит (Killed) на VPS | Перейти на деплой через GitHub Actions (сборка не на VPS) или добавить swap. |
| Пустые проекты / нет данных | Нет файлов в `data/*.db` — скопировать с прода или с локальной машины (`scp`). |

---

## Старые пути в репозитории

Файлы `deploy/team-tracker.service` и `deploy/agency-pm-board.service` ссылаются на `/root/.openclaw/workspace/...` — это **старая** раскладка. Для чистого VPS используйте **`deploy/team-tracker.vps.example.service`**.

Если пришлёте вывод `journalctl -u team-tracker -n 50` после падения — по логу можно сказать точнее.
