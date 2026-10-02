-- 083 — скрыть фонд «Траты на жизнь»
DELETE FROM v2_personal_finance_funds
WHERE fund_key = 'life'
   OR name = 'Траты на жизнь';
