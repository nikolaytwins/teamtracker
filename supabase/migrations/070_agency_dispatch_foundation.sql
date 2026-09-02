-- 070 — Sofia dispatch: поля планирования на agency_project + runtime-правила

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS dispatch_work_status TEXT NOT NULL DEFAULT 'planned';

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS work_deadline TIMESTAMPTZ;

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS planned_hours_remaining DOUBLE PRECISION;

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS payment_certain_this_month BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE agency_project
  ADD COLUMN IF NOT EXISTS work_model_type TEXT NOT NULL DEFAULT 'other';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agency_project_dispatch_work_status_check'
  ) THEN
    ALTER TABLE agency_project
      ADD CONSTRAINT agency_project_dispatch_work_status_check
      CHECK (dispatch_work_status IN ('planned', 'in_progress', 'on_approval', 'revisions', 'done'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agency_project_work_model_type_check'
  ) THEN
    ALTER TABLE agency_project
      ADD CONSTRAINT agency_project_work_model_type_check
      CHECK (
        work_model_type IN (
          'site',
          'presentation',
          'support',
          'legacy_tail',
          'course',
          'own_project',
          'other'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN agency_project.dispatch_work_status IS
  'Sofia Plan: planned | in_progress | on_approval | revisions | done. Отдельно от work_status канбана.';
COMMENT ON COLUMN agency_project.work_deadline IS
  'Рабочий дедлайн для планировщика; deadline — клиентский/финансовый.';
COMMENT ON COLUMN agency_project.planned_hours_remaining IS
  'Примерный остаток плановых часов по проекту.';
COMMENT ON COLUMN agency_project.payment_certain_this_month IS
  'Пользователь подтвердил: точно получу в этом месяце (для надёжной прибыли).';

CREATE TABLE IF NOT EXISTS agency_dispatch_rules (
  id TEXT PRIMARY KEY DEFAULT 'default',
  rules_json JSONB NOT NULL,
  rules_text_md TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO agency_dispatch_rules (id, rules_json, rules_text_md, updated_at)
VALUES (
  'default',
  '{
    "capacity": {
      "plannedHoursPerDay": 4,
      "reserveShare": 0.2
    },
    "protected": {
      "strategyHoursPerWeek": 3,
      "arkaliumDaysPerWeek": 1
    },
    "pricing": {
      "minEffectiveRateRub": 4000,
      "targetEffectiveRateRub": 5000,
      "urgentEffectiveRateRub": 6000,
      "webinarSlidesPerHour": 20
    },
    "finance": {
      "reliableProfitMinRub": 170000,
      "plannedProfitTargetRub": 200000
    }
  }'::jsonb,
  NULL,
  NOW()
)
ON CONFLICT (id) DO NOTHING;
