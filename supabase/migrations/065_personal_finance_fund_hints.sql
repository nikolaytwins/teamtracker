-- 065 — подсказки и название фондов одежды и подарков
UPDATE v2_personal_finance_funds
SET monthly_hint = '5 000 ₽ каждый месяц'
WHERE fund_key = 'clothing';

UPDATE v2_personal_finance_funds
SET
  name = 'Подарки и праздники',
  monthly_hint = '10 000 ₽ каждый месяц'
WHERE fund_key = 'gifts';
