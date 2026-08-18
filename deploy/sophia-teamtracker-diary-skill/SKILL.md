---
name: teamtracker-diary
description: >
  Дневник Team Tracker (tt.twinlabs.ru). Use when user sends a diary note with #tags on the last line, or starts with «дневник:». Run diary.py and reply briefly if output starts with OK.
---

# Дневник Team Tracker

Записи попадают в `/v2/personal/observations` (личный дневник).

## Когда использовать

- Сообщение заканчивается **строкой только с хештегами**: `#vibecoding #arkalium`
- Или начинается с **`дневник:`** (теги опционально внизу)

## Вызов

```bash
cd /root/.openclaw/workspace
python3 skills/teamtracker-diary/diary.py --message "<текст сообщения пользователя целиком>"
```

## Поведение

1. **Перед обычным ответом** в личном чате с Николаем выполни скрипт с полным текстом его сообщения.
2. Если stdout начинается с `OK:` — ответь **коротко** (1 предложение), что записала в дневник. Можно повторить теги.
3. Если `SKIP:` — это не дневник, продолжай как обычно.
4. Если `ERROR:` — скажи, что не удалось записать, и кратко причину из stdout.

## Формат заметки

```
Сегодня закрыл важную задачу по проекту, чувствую спокойствие.

#vibecoding #работа
```

Теги с нижней строки автоматически отделятся от текста.
