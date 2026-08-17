-- Счета, которые входят в подушку (очередь целей: Подушка №1, №2, …).

ALTER TABLE public.v2_personal_accounts
  ADD COLUMN IF NOT EXISTS in_cushion boolean NOT NULL DEFAULT false;

UPDATE public.v2_personal_accounts
SET in_cushion = true
WHERE account_type = 'cushion';
