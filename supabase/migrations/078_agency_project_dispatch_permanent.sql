-- 078 — Статус «постоянные» в Sofia Plan dispatch_work_status

ALTER TABLE agency_project
  DROP CONSTRAINT IF EXISTS agency_project_dispatch_work_status_check;

ALTER TABLE agency_project
  ADD CONSTRAINT agency_project_dispatch_work_status_check
  CHECK (
    dispatch_work_status IN (
      'planned',
      'in_progress',
      'on_approval',
      'revisions',
      'done',
      'permanent'
    )
  );

COMMENT ON COLUMN agency_project.dispatch_work_status IS
  'Sofia Plan: planned | in_progress | on_approval | revisions | done | permanent. Отдельно от work_status канбана.';
