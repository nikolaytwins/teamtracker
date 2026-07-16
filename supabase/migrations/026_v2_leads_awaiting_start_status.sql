-- 026 — статус лидов «Ожидает начала работы».

ALTER TABLE v2_leads
  DROP CONSTRAINT IF EXISTS v2_leads_status_check;

ALTER TABLE v2_leads
  ADD CONSTRAINT v2_leads_status_check
  CHECK (status IN ('correspondence', 'thinking', 'awaiting_start', 'pause', 'lost'));
