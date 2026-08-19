-- 055 — масштаб «лайфстайл» у желаний (выше «крайне важного» в ленте).

ALTER TABLE public.v2_personal_wishes
  DROP CONSTRAINT IF EXISTS v2_personal_wishes_scale_check;

ALTER TABLE public.v2_personal_wishes
  ADD CONSTRAINT v2_personal_wishes_scale_check
  CHECK (scale IN ('lifestyle', 'critical', 'large', 'small'));
