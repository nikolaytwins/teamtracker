-- 011 — Supabase Storage bucket для загрузки файлов проектов и задач v2.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('v2-attachments', 'v2-attachments', true, 52428800)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;
