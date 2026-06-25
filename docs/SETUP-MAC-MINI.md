# Первый запуск на новом Mac (Mac mini)

Для человека: **2 минуты вручную**, остальное — промпт в Cursor Agent.

## Вручную (до промпта)

1. **AirDrop / USB / iCloud:** скопировать с текущего Mac файл  
   `team-tracker/.env.local` → на Mac mini в `~/Desktop/team-tracker/.env.local`  
   (если папки ещё нет — положить на Рабочий стол, агент сам положит куда надо)

2. На Mac mini открыть **Cursor** → **Agent mode** → вставить промпт ниже.

3. Если `git push` не работает — один раз добавить SSH-ключ в GitHub (агент подскажет команды).

---

## Промпт для Cursor на Mac mini (скопировать целиком)

```
Ты на новом Mac mini. Нужно поднять локальную разработку проекта team-tracker с нуля.

Репозиторий: git@github.com:nikolaytwins/teamtracker.git
Прод: https://tt.twinlabs.ru (TEAM_TRACKER_ROOT_DOMAIN=1, порт dev 3003)

Сделай всё сам, без лишних вопросов — только если реально заблокирован (нет .env.local, нет Node, нет доступа к GitHub).

План:
1. Проверь: git, node (нужен 20+), npm. Если чего-то нет — установи через Homebrew или подскажи одну команду для пользователя.
2. Если ~/Desktop/team-tracker или ~/Projects/team-tracker ещё нет — git clone репозиторий в ~/Desktop/team-tracker.
3. cd в папку проекта, git pull origin main.
4. npm install.
5. Проверь наличие .env.local:
   - если есть на Desktop как .env.local — скопируй в корень проекта
   - если нет — остановись и скажи: «Положи .env.local с другого Mac через AirDrop в ~/Desktop/.env.local»
6. Прочитай README.md и docs/SUPABASE-DATA-AND-MIGRATIONS.md — кратко резюмируй стек (Next.js 16, Supabase, порт 3003).
7. Запусти npm run dev, дождись что сервер поднялся на :3003.
8. Проверь что curl http://localhost:3003 отвечает (или /agency).
9. Настрой git если нужно: git config user.name и user.email — спроси у пользователя только если commit author пустой.
10. Проверь ssh -T git@github.com — если fail, выведи пошагово как создать SSH-ключ и добавить в GitHub.

В конце выдай короткий отчёт:
- путь к проекту
- как запускать dev (команда)
- что скопировано / чего не хватало
- готов ли git push

Не коммить и не пушь без явной просьбы пользователя.
```

---

## Продолжить разработку после настройки

Новый чат в Cursor на mini:

```
Проект team-tracker уже поднят локально (npm run dev на :3003).
Продолжаем разработку. Прочитай README, .cursor/rules/, последние коммиты в main.
[опиши задачу]
```

---

## Что НЕ переносится автоматически

| Что | Решение |
|-----|---------|
| `.env.local` | AirDrop с текущего Mac (секреты не в git) |
| История чатов Cursor | Новый чат; контекст — код в репо |
| User rules / Skills | Cursor Settings → Sync, или скопировать `~/.cursor/` |
| Локальные SQLite `data/*.db` | Обычно не нужны — прод на Supabase. Если нужны: `./scripts/sync-agency-db-from-production.sh` |

## Cursor Settings Sync (опционально)

Cursor → Settings → включить синхронизацию аккаунта — подтянутся rules, extensions с другого Mac (если тот же аккаунт Cursor).
