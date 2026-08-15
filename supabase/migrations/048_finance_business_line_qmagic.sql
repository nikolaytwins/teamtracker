-- 048 — направление проекта: agency / impulse / qmagic.

ALTER TABLE agency_project
  DROP CONSTRAINT IF EXISTS agency_project_business_line_check;

ALTER TABLE agency_project
  ADD CONSTRAINT agency_project_business_line_check
  CHECK (business_line IN ('agency', 'impulse', 'qmagic'));

COMMENT ON COLUMN agency_project.business_line IS 'Направление: agency | impulse | qmagic';

ALTER TABLE v2_finance_projects
  DROP CONSTRAINT IF EXISTS v2_finance_projects_business_line_check;

ALTER TABLE v2_finance_projects
  ADD CONSTRAINT v2_finance_projects_business_line_check
  CHECK (business_line IN ('agency', 'impulse', 'qmagic'));
