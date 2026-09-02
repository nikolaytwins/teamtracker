-- 072 pomesyachnye srednie kursy CB (dlya grafikov v USD)

CREATE TABLE IF NOT EXISTS v2_fx_monthly_rates (
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  currency_code TEXT NOT NULL DEFAULT 'USD',
  avg_rate_to_rub DOUBLE PRECISION NOT NULL,
  sample_days INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'cbr',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (year, month, currency_code)
);

CREATE INDEX IF NOT EXISTS idx_v2_fx_monthly_rates_currency
  ON v2_fx_monthly_rates (currency_code, year DESC, month DESC);

COMMENT ON TABLE v2_fx_monthly_rates IS
  'Средний официальный курс ЦБ за календарный месяц (₽ за 1 USD).';
