-- 056 — личный раздел «Спорт»: JSONB doc (недели, программа, тренировки).

ALTER TABLE v2_personal_life_docs
  DROP CONSTRAINT IF EXISTS v2_personal_life_docs_kind_check;

ALTER TABLE v2_personal_life_docs
  ADD CONSTRAINT v2_personal_life_docs_kind_check
  CHECK (kind IN ('time', 'brand', 'life_strategy', 'mycode', 'sport'));
