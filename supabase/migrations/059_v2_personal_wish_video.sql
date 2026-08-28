-- 059 v2 personal wish video media_type column

ALTER TABLE v2_personal_wish_images
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v2_personal_wish_images_media_type_check'
  ) THEN
    ALTER TABLE v2_personal_wish_images
      ADD CONSTRAINT v2_personal_wish_images_media_type_check
      CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;

UPDATE v2_personal_wish_images
SET media_type = 'video'
WHERE media_type = 'image'
  AND lower(name) ~ '\.(mp4|webm|mov|m4v|ogv|ogg)$';
