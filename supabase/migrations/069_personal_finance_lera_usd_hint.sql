-- 069 — фонд Леры: 5 000 ₽ каждый месяц на рублёвый счёт (исправляет 067, где был USD)

UPDATE v2_personal_finance_funds
SET monthly_hint = '5 000 ₽ каждый месяц · счёт в ₽'
WHERE fund_key = 'lera';
