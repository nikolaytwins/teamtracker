import { createSupabaseServiceClient } from "@/lib/supabase-service";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** Имя bucket в Supabase Storage (создайте в Dashboard или через миграцию). */
export function getAvatarStorageBucket(): string {
  return process.env.TEAM_TRACKER_AVATAR_BUCKET?.trim() || "avatars";
}

export function isSupabaseAvatarUploadConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

function extForMime(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

/**
 * Загрузка файла аватара в Supabase Storage, возвращает публичный URL для `tt_users.avatar_url`.
 */
export async function uploadUserAvatarToSupabaseStorage(
  userId: string,
  buffer: Buffer,
  contentType: string
): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  if (!ALLOWED_TYPES.has(contentType)) {
    return { ok: false, error: "Допустимы только JPEG, PNG, GIF или WebP" };
  }
  if (buffer.length > MAX_BYTES) {
    return { ok: false, error: "Файл не больше 2 МБ" };
  }
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "user";
  const path = `${safeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extForMime(contentType)}`;
  let sb: ReturnType<typeof createSupabaseServiceClient>;
  try {
    sb = createSupabaseServiceClient();
  } catch {
    return { ok: false, error: "Хранилище не настроено (нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY)" };
  }
  const bucket = getAvatarStorageBucket();
  const { error } = await sb.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    console.error("Supabase avatar upload", error);
    const msg = error.message || "Ошибка загрузки";
    if (msg.toLowerCase().includes("bucket") || error.message?.includes("not found")) {
      return {
        ok: false,
        error: `Bucket «${bucket}» не найден. Создайте публичный bucket в Supabase Storage или задайте TEAM_TRACKER_AVATAR_BUCKET.`,
      };
    }
    return { ok: false, error: msg };
  }
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl?.trim();
  if (!publicUrl) return { ok: false, error: "Не удалось получить публичную ссылку на файл" };
  return { ok: true, publicUrl };
}
