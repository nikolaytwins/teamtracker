-- 039 — валютные счета: исходная валюта + курс ЦБ для рублевой оценки капитала.

ALTER TABLE v2_personal_accounts
  ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'RUB';

ALTER TABLE v2_personal_accounts
  ADD COLUMN IF NOT EXISTS balance_native DOUBLE PRECISION;

-- Для рублёвых счетов native = balance_rub; для уже существующих — то же.
UPDATE v2_personal_accounts
SET balance_native = balance_rub
WHERE balance_native IS NULL;

ALTER TABLE v2_personal_accounts
  ALTER COLUMN balance_native SET DEFAULT 0;

ALTER TABLE v2_personal_accounts
  ALTER COLUMN balance_native SET NOT NULL;

ALTER TABLE v2_personal_accounts
  DROP CONSTRAINT IF EXISTS v2_personal_accounts_currency_code_check;

ALTER TABLE v2_personal_accounts
  ADD CONSTRAINT v2_personal_accounts_currency_code_check
  CHECK (currency_code IN ('RUB', 'USD', 'AED', 'GEL', 'EUR', 'GBP', 'CNY'));

COMMENT ON COLUMN v2_personal_accounts.currency_code IS 'Код валюты счёта (ISO). RUB — обычный рублёвый счёт';
COMMENT ON COLUMN v2_personal_accounts.balance_native IS 'Остаток в исходной валюте. Для RUB совпадает с balance_rub';
COMMENT ON COLUMN v2_personal_accounts.balance_rub IS 'Рублёвая оценка (для валютных — по курсу ЦБ). Используется в сумме капитала';

CREATE INDEX IF NOT EXISTS idx_v2_personal_accounts_currency
  ON v2_personal_accounts (user_id, currency_code)
  WHERE currency_code <> 'RUB';

-- Курсы ЦБ: сколько рублей за 1 единицу валюты.
CREATE TABLE IF NOT EXISTS v2_fx_rates (
  currency_code TEXT PRIMARY KEY,
  rate_to_rub DOUBLE PRECISION NOT NULL,
  as_of_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'cbr',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE v2_fx_rates IS 'Курсы валют к рублю (ЦБ РФ), обновляются раз в сутки';

-- Уже созданные «дирхамы» / «лари»: число на балансе считаем остатком в исходной валюте.
UPDATE v2_personal_accounts
SET
  currency_code = 'AED',
  balance_native = balance_rub,
  updated_at = now()
WHERE currency_code = 'RUB'
  AND (
    lower(name) LIKE '%дирхам%'
    OR lower(name) LIKE '%dirham%'
    OR lower(name) = 'aed'
  );

UPDATE v2_personal_accounts
SET
  currency_code = 'GEL',
  balance_native = balance_rub,
  updated_at = now()
WHERE currency_code = 'RUB'
  AND (
    lower(name) LIKE '%лари%'
    OR lower(name) LIKE '%lari%'
    OR lower(name) = 'gel'
  );
