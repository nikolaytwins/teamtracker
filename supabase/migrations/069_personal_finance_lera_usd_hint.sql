-- 069 — подсказка фонда Леры: 5 000 $ (USD), не ₽

UPDATE v2_personal_finance_funds
SET monthly_hint = '5 000 $ каждый месяц · счёт в USD'
WHERE fund_key = 'lera';
