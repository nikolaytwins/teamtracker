-- 096 — глобальное желание Twinshotel (отель + джаз + бар + ресторан + коворкинг + клуб).

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
  'pwish_' || substr(md5(u.user_id || ':twinshotel'), 1, 20),
  u.user_id,
  'Twinshotel',
  'Создать ультрапремиум пространство, объединяющее отель, джаз-пространство, бар, ресторан, коворкинг и стриптиз-клуб на нижних этажах.',
  '',
  ARRAY['material', 'create', 'life', 'intimacy']::text[],
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
      w.id = 'pwish_' || substr(md5(u.user_id || ':twinshotel'), 1, 20)
      OR lower(w.title) = 'twinshotel'
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
    (1, '/wishes/twinshotel-1.jpg', 'twinshotel-1.jpg', 0),
    (2, '/wishes/twinshotel-2.jpg', 'twinshotel-2.jpg', 1),
    (3, '/wishes/twinshotel-3.jpg', 'twinshotel-3.jpg', 2)
) AS s(slot, url, name, sort_order)
WHERE lower(w.title) = 'twinshotel'
  AND NOT EXISTS (
    SELECT 1
    FROM v2_personal_wish_images AS i
    WHERE i.wish_id = w.id
      AND i.url = s.url
  );
