-- 035 — направление проекта (агентство / импульс) для будущей разбивки выручки.

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS business_line TEXT NOT NULL DEFAULT 'agency';

ALTER TABLE agency_project
  DROP CONSTRAINT IF EXISTS agency_project_business_line_check;

ALTER TABLE agency_project
  ADD CONSTRAINT agency_project_business_line_check
  CHECK (business_line IN ('agency', 'impulse'));

COMMENT ON COLUMN agency_project.business_line IS 'Направление: agency (агентство) или impulse (импульс)';

-- Параллельная таблица v2_finance (если используется) — та же метка.
ALTER TABLE v2_finance_projects
  ADD COLUMN IF NOT EXISTS business_line TEXT NOT NULL DEFAULT 'agency';

ALTER TABLE v2_finance_projects
  DROP CONSTRAINT IF EXISTS v2_finance_projects_business_line_check;

ALTER TABLE v2_finance_projects
  ADD CONSTRAINT v2_finance_projects_business_line_check
  CHECK (business_line IN ('agency', 'impulse'));
