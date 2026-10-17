-- План, материалы, выводы и идеи на странице гипотезы.

ALTER TABLE v2_personal_hypotheses
  ADD COLUMN IF NOT EXISTS workspace JSONB;

COMMENT ON COLUMN v2_personal_hypotheses.workspace IS
  'Страница гипотезы: этапы и задачи, файлы, выводы, идеи.';
