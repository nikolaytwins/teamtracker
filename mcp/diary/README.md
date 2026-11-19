# Team Tracker MCP (read-only)

HTTP MCP для ChatGPT / Sophia: чтение вкладок платформы и дневника.

- Endpoint: `https://tt.twinlabs.ru/mcp`
- Auth: `TT_INTEGRATION_SECRET` (Bearer или OAuth-форма)
- Tools:
  - `list_sections` — каталог вкладок
  - `read_section` — текст раздела (`home`, `finance`, `hypotheses`, `goals`, `important`, `articles`, `sport`, `diary`, …)
  - дневник: `search_entries`, `get_entry`, `search_conclusions`, …

Локально:

```bash
TT_INTEGRATION_SECRET=... \
TT_PLATFORM_API_URL=http://127.0.0.1:3003/api/integrations/sophia/platform \
TT_DIARY_API_URL=http://127.0.0.1:3003/api/integrations/sophia/diary \
npm start
```
