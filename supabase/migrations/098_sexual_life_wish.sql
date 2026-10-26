-- 098 — галерея «Sexual life» из фото ЛАЙФ/сексуальность (public/wishes/sexual-life-*.jpg).

INSERT INTO v2_personal_wishes (
  id,
  user_id,
  title,
  description,
  note,
  categories,
  scale,
  is_near,
  grid_col,
  grid_row,
  sort_order,
  created_at,
  updated_at
)
SELECT
  'pwish_' || substr(md5(u.user_id || ':sexual-life'), 1, 20),
  u.user_id,
  'Sexual life',
  'Насыщенная сексуальная жизнь: атмосфера, приключения, взаимное притяжение и свобода быть желанным.',
  '',
  ARRAY['intimacy', 'life']::text[],
  'lifestyle',
  false,
  2,
  7,
  COALESCE(
    (
      SELECT MIN(w.sort_order) - 1
      FROM v2_personal_wishes AS w
      WHERE w.user_id = u.user_id
    ),
    0
  ),
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_workspace_members
  UNION
  SELECT DISTINCT user_id
  FROM v2_personal_wishes
) AS u
WHERE NOT EXISTS (
  SELECT 1
  FROM v2_personal_wishes AS w
  WHERE w.user_id = u.user_id
    AND (
      w.id = 'pwish_' || substr(md5(u.user_id || ':sexual-life'), 1, 20)
      OR lower(w.title) IN ('sexual life', 'sexuality', 'сексуальная жизнь', 'сексуальность')
    )
);

INSERT INTO v2_personal_wish_images (
  id,
  wish_id,
  url,
  name,
  media_type,
  sort_order,
  created_at
)
SELECT
  'pwimg_' || substr(md5(w.id || ':' || s.slot), 1, 20),
  w.id,
  s.url,
  s.name,
  'image',
  s.sort_order,
  now()
FROM v2_personal_wishes AS w
CROSS JOIN (
  VALUES
    (1, '/wishes/sexual-life-1.jpg', 'sexual-life-1.jpg', 0),
    (2, '/wishes/sexual-life-2.jpg', 'sexual-life-2.jpg', 1),
    (3, '/wishes/sexual-life-3.jpg', 'sexual-life-3.jpg', 2),
    (4, '/wishes/sexual-life-4.jpg', 'sexual-life-4.jpg', 3),
    (5, '/wishes/sexual-life-5.jpg', 'sexual-life-5.jpg', 4),
    (6, '/wishes/sexual-life-6.jpg', 'sexual-life-6.jpg', 5),
    (7, '/wishes/sexual-life-7.jpg', 'sexual-life-7.jpg', 6),
    (8, '/wishes/sexual-life-8.jpg', 'sexual-life-8.jpg', 7),
    (9, '/wishes/sexual-life-9.jpg', 'sexual-life-9.jpg', 8)
) AS s(slot, url, name, sort_order)
WHERE lower(w.title) IN ('sexual life', 'sexuality', 'сексуальная жизнь', 'сексуальность')
  AND NOT EXISTS (
    SELECT 1
    FROM v2_personal_wish_images AS i
    WHERE i.wish_id = w.id
      AND i.url = s.url
  );
