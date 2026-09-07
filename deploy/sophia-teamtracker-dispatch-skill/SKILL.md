---
name: teamtracker-dispatch
description: >
  Рабочий диспетчер Team Tracker (tt.twinlabs.ru): проекты агентства, план, ставки, сроки,
  прибыль месяца; чтение и запись календарных блоков плана. Use when Nikolay asks about
  taking a project, price, deadline, workload, replanning, what to do now, strategy/creative
  day, agency money, or explicitly asks to add/move/delete plan blocks or set day modes.
  Always run dispatch.py before advising. Run plan.py only on explicit write commands —
  never guess hours or profit from memory.
---

# Team Tracker — рабочий диспетчер (Sofia Plan)

Веб-план: `https://tt.twinlabs.ru/v2/agency/plan`  
Веб-чат Софии: `https://tt.twinlabs.ru/v2/agency/sofia`

## Когда использовать (обязательно)

Перед ответом, если Николай спрашивает про:

- новый проект / «можно брать?» / цену и срок;
- срочную задачу или переключение;
- перестроить план;
- «что делать сейчас»;
- загрузку, резерв, стратегию или **творческий день**;
- деньги агентства в этом месяце (надёжная vs плановая прибыль);
- **добавить / перенести / удалить блок в плане**;
- **поставить стратегию / творческий / выходной**.

**Не** проси вручную перечислять проекты и цифры — сначала прочитай Team Tracker.

## Чтение контекста (каждый раз перед советом)

```bash
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/dispatch.py
```

С вопросом пользователя:

```bash
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/dispatch.py \
  --for-message "лендинг 35 000 ₽, до 12 сентября, 10 часов — брать?"
```

## Календарь плана (чтение блоков)

Перед записью или если нужны даты/часы по дням:

```bash
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/plan.py calendar
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/plan.py calendar \
  --from 2026-09-08 --to 2026-09-21
```

В выводе у каждого блока есть `id` — он нужен для update/delete.

## Запись в план (только по явной команде)

Пиши в календарь **только** если Николай явно сказал: «добавь», «запиши в план»,
«перенеси», «поставь стратегию», «убери блок» и т.п.  
«Можно брать?» / совет — **без** записи.

### Создать блок

```bash
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/plan.py create \
  --title "Автосайт — вёрстка" \
  --date 2026-09-10 \
  --hours 4 \
  --kind task
```

Опционально: `--project-id <uuid>`, `--time 10:00`, `--kind call|personal`.

### Перенести / изменить блок

```bash
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/plan.py update \
  --id <item-id> \
  --date 2026-09-12 \
  --hours 3
```

### Удалить блок

```bash
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/plan.py delete --id <item-id>
```

### Режим дня (стратегия / творчество / отдых)

```bash
python3 /root/.openclaw/workspace/skills/teamtracker-dispatch/plan.py day-mode \
  --date 2026-09-11 \
  --mode strategy
```

`--mode`: `strategy` | `creative` | `rest` | `normal` (снять режим).

После успешной записи коротко подтверди, что изменилось, и при необходимости
перечитай `dispatch.py` или `plan.py calendar`.

## Формат ответа в Telegram / VK

Коротко, по-русски, в голосе Софии, но **структурно**:

**Главное решение:** одно действие.

**Запасной вариант:** одна альтернатива.

**Почему:** 2–4 факта из вывода скрипта (ставка, часы, дедлайн, деньги, резерв).

**Что изменится:** конкретные движения плана (если есть).

**Клиенту:** готовый короткий текст (если нужна договорённость).

Не лекция. Не стыд. Не выдумывай проекты и часы.

## Правила решений (кратко)

1. Ставка ниже порога из контекста → предложи поднять цену, сократить объём или сдвинуть срок.
2. Резерв — не обычное место под новый проект.
3. Сохраняй стратегию и творческий день.
4. «Можно брать?» — только совет, **без** создания проекта и без записи в план.
5. «Беру / добавь проект» — создание сущности проекта пока через веб; в план блок можно добавить через `plan.py create`.
6. Перенос **клиентского** дедлайна — только после явного подтверждения (пока через веб).
7. Внутренний блок плана / режим дня — можно менять сразу после явной команды.

## Ошибки

- `ERROR: TT_INTEGRATION_SECRET` — проверить `/etc/team-tracker.env` на VPS.
- `API 401` — секрет не совпадает с Team Tracker.
- `API 404` на plan/* — деплой TT ещё без write-API; скажи Николаю обновить tt.twinlabs.ru.
- `API 500` — деплой TT или миграции; сообщи Николаю.

## Связанные skills

- `teamtracker-diary` — личный дневник (`дневник:`, хештеги). Не путать с планом.
