# OpenClaw: Team Tracker finance (Telegram / VK)

Skill в репозитории: `deploy/sophia-teamtracker-finance-skill/`.

## Установка на VPS OpenClaw

```bash
scp -r deploy/sophia-teamtracker-finance-skill root@178.72.168.156:/tmp/
ssh root@178.72.168.156 'bash /tmp/sophia-teamtracker-finance-skill/install.sh'
```

В `TOOLS.md` workspace должен быть блок «Team Tracker — финансы».

## API

- `GET/POST https://tt.twinlabs.ru/api/integrations/sophia/finance`
- Header: `x-tt-integration-secret: <TT_INTEGRATION_SECRET>`

## Веб-чат

`/v2/personal/finance/assistant` — тот же сценарий в UI.
