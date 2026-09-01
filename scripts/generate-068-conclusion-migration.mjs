import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");
const body = fs.readFileSync(
  path.join(root, "content/personal/observations/august-2026-conclusion.md"),
  "utf8"
);
const tag = "aug2026_conclusion_body";
if (body.includes(tag)) {
  throw new Error("delimiter collision in markdown body");
}

const title = "Итоги августа 2026: наблюдения и решения";
const sql = `-- 068 — вывод августа 2026 (замена прежней записи)

DELETE FROM v2_personal_observation_tag_links
WHERE observation_id IN (
  SELECT id
  FROM v2_personal_observations
  WHERE obs_type = 'conclusion'
    AND observed_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
    AND observed_at < TIMESTAMPTZ '2026-09-01 00:00:00+00'
);

DELETE FROM v2_personal_observations
WHERE obs_type = 'conclusion'
  AND observed_at >= TIMESTAMPTZ '2026-08-01 00:00:00+00'
  AND observed_at < TIMESTAMPTZ '2026-09-01 00:00:00+00';

INSERT INTO v2_personal_observations (
  id,
  user_id,
  obs_type,
  title,
  body,
  why,
  link_key,
  observed_at,
  created_at,
  updated_at
)
SELECT
  'pobs_aug2026_' || substr(md5(u.user_id), 1, 16),
  u.user_id,
  'conclusion',
  '${title.replace(/'/g, "''")}',
  $${tag}$
${body}$${tag}$,
  '',
  NULL,
  TIMESTAMPTZ '2026-08-31 12:00:00+00',
  now(),
  now()
FROM (
  SELECT DISTINCT user_id
  FROM v2_workspace_members
) AS u
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  obs_type = EXCLUDED.obs_type,
  observed_at = EXCLUDED.observed_at,
  updated_at = now();
`;

const outPath = path.join(root, "supabase/migrations/068_august_2026_conclusion.sql");
fs.writeFileSync(outPath, sql);
const lines = sql.split("\n");
console.log("written", outPath);
console.log("line 34:", lines[33]);
console.log("close near end:", lines.find((l) => l.startsWith("$aug2026")));
