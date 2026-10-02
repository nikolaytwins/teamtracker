-- 082 — убрать лишние фонды: квартира, Москва, Китай, ИИ, залог
DELETE FROM v2_personal_finance_funds
WHERE fund_key IN ('apartment', 'moscow', 'china', 'ai', 'rent_deposit')
   OR name IN (
     'Квартира',
     'Фонд Москва',
     'Фонд Китай',
     'ИИ',
     'Фонд залог за квартиру'
   );
