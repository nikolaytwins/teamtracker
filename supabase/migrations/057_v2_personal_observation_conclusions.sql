-- 057 — дневник: тип записи «вывод» (месячные выводы).

ALTER TABLE v2_personal_observations
  DROP CONSTRAINT IF EXISTS v2_personal_observations_type_check;

ALTER TABLE v2_personal_observations
  ADD CONSTRAINT v2_personal_observations_type_check
  CHECK (
    obs_type IN (
      'loop', 'chance', 'market', 'magnet', 'person', 'pattern', 'place', 'love', 'other', 'conclusion'
    )
  );
