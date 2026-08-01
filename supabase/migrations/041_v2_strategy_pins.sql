-- 041: страница Стратегия — закреплённые карточки фокуса месяцев.

CREATE TABLE IF NOT EXISTS v2_strategy_pins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month_label TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v2_strategy_pins_user
  ON v2_strategy_pins (user_id, sort_order, created_at);

COMMENT ON TABLE v2_strategy_pins IS 'Закреплённые фокусы месяцев на странице Стратегия';

ALTER TABLE v2_strategy_pins ENABLE ROW LEVEL SECURITY;
