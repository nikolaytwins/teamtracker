-- 081 — евро-счёт по образцу существующего долларового счёта
INSERT INTO v2_personal_accounts (
  id,
  user_id,
  name,
  account_type,
  icon_key,
  accent,
  currency_code,
  balance_native,
  balance_rub,
  note,
  disposable,
  in_cushion,
  goal_amount_rub,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'pacc_' || substr(md5(usd.user_id || ':currency:EUR'), 1, 20),
  usd.user_id,
  'Евро',
  usd.account_type,
  usd.icon_key,
  usd.accent,
  'EUR',
  0,
  0,
  usd.note,
  usd.disposable,
  usd.in_cushion,
  usd.goal_amount_rub,
  (
    SELECT COALESCE(MAX(existing.sort_order), -1) + 1
    FROM v2_personal_accounts AS existing
    WHERE existing.user_id = usd.user_id
  ),
  now(),
  now()
FROM v2_personal_accounts AS usd
WHERE usd.currency_code = 'USD'
  AND NOT EXISTS (
    SELECT 1
    FROM v2_personal_accounts AS eur
    WHERE eur.user_id = usd.user_id
      AND eur.currency_code = 'EUR'
  );
