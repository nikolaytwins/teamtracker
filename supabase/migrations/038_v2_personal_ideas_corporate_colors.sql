-- 038 — корпоративная палитра идей и заметок вместо пастельной.

ALTER TABLE v2_personal_idea_tags
  ALTER COLUMN color SET DEFAULT '#2A56EB';

ALTER TABLE v2_personal_ideas
  ALTER COLUMN accent SET DEFAULT '#E7EDFD';

-- Перекрашиваем ранее выданные пастельные теги в насыщенные тона того же оттенка.
UPDATE v2_personal_idea_tags
SET color = CASE upper(color)
    WHEN '#FDE68A' THEN '#D97706'
    WHEN '#BFDBFE' THEN '#2A56EB'
    WHEN '#FECACA' THEN '#DC2626'
    WHEN '#E9D5FF' THEN '#7C3AED'
    WHEN '#FED7AA' THEN '#EA580C'
    WHEN '#BBF7D0' THEN '#059669'
    WHEN '#FBCFE8' THEN '#DB2777'
    WHEN '#A5F3FC' THEN '#0F766E'
    ELSE color
  END,
  updated_at = now()
WHERE upper(color) IN (
  '#FDE68A', '#BFDBFE', '#FECACA', '#E9D5FF', '#FED7AA', '#BBF7D0', '#FBCFE8', '#A5F3FC'
);

UPDATE v2_personal_ideas
SET accent = CASE upper(accent)
    WHEN '#FEF3C7' THEN '#FCEFD9'
    WHEN '#DBEAFE' THEN '#E7EDFD'
    WHEN '#FEE2E2' THEN '#FCE4E4'
    WHEN '#F3E8FF' THEN '#F0E9FE'
    WHEN '#FFEDD5' THEN '#FDE9DB'
    WHEN '#DCFCE7' THEN '#DBF2E8'
    WHEN '#FCE7F3' THEN '#FCE3EE'
    WHEN '#CFFAFE' THEN '#DBF0EE'
    ELSE accent
  END,
  updated_at = now()
WHERE upper(accent) IN (
  '#FEF3C7', '#DBEAFE', '#FEE2E2', '#F3E8FF', '#FFEDD5', '#DCFCE7', '#FCE7F3', '#CFFAFE'
);
