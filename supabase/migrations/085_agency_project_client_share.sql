-- 085 — публичная ссылка сметы для клиента (без часов и ставки)

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS client_share_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agency_project_client_share_token
  ON agency_project (client_share_token)
  WHERE client_share_token IS NOT NULL AND btrim(client_share_token) <> '';

COMMENT ON COLUMN agency_project.client_share_token IS
  'Общий токен публичной страницы /c/{token}. Копии проекта по месяцам делят один токен.';
