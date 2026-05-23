-- Тип проекта (разовый / постоянный), доступ клиента, помесячные задачи

ALTER TABLE v2_projects
  ADD COLUMN IF NOT EXISTS engagement_type TEXT NOT NULL DEFAULT 'one_off',
  ADD COLUMN IF NOT EXISTS client_access_enabled BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  ALTER TABLE v2_projects
    ADD CONSTRAINT v2_projects_engagement_type_check
    CHECK (engagement_type IN ('one_off', 'retainer'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE v2_project_members
  ADD COLUMN IF NOT EXISTS member_role TEXT NOT NULL DEFAULT 'team';

DO $$
BEGIN
  ALTER TABLE v2_project_members
    ADD CONSTRAINT v2_project_members_role_check
    CHECK (member_role IN ('team', 'client', 'lead'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE v2_tasks
  ADD COLUMN IF NOT EXISTS work_month DATE NULL;

CREATE INDEX IF NOT EXISTS idx_v2_tasks_project_work_month
  ON v2_tasks (project_id, work_month)
  WHERE work_month IS NOT NULL AND deleted_at IS NULL;
