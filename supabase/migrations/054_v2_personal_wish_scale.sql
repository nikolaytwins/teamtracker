-- 054 — масштаб желания и флаг «ближайшее».

ALTER TABLE public.v2_personal_wishes
  ADD COLUMN IF NOT EXISTS scale TEXT NOT NULL DEFAULT 'large';

ALTER TABLE public.v2_personal_wishes
  ADD COLUMN IF NOT EXISTS is_near BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.v2_personal_wishes
  DROP CONSTRAINT IF EXISTS v2_personal_wishes_scale_check;

ALTER TABLE public.v2_personal_wishes
  ADD CONSTRAINT v2_personal_wishes_scale_check
  CHECK (scale IN ('critical', 'large', 'small'));

CREATE INDEX IF NOT EXISTS idx_v2_personal_wishes_user_scale
  ON public.v2_personal_wishes (user_id, scale, is_near DESC, sort_order ASC);
