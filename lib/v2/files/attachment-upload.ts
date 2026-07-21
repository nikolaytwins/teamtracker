import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { fileKindFromName, sanitizeUploadFilename } from "@/lib/v2/files/file-kind";

const MAX_BYTES = 50 * 1024 * 1024;

export function getAttachmentStorageBucket(): string {
  return process.env.TEAM_TRACKER_ATTACHMENT_BUCKET?.trim() || "v2-attachments";
}

export function isAttachmentUploadConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && key);
}

export type UploadedAttachment = {
  name: string;
  url: string;
  sizeBytes: number;
  kind: string;
  contentType: string;
};

function storagePath(prefix: "projects" | "tasks" | "ideas", entityId: string, filename: string): string {
  const safeEntity = entityId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const safeName = sanitizeUploadFilename(filename);
  return `${prefix}/${safeEntity}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
}

export async function uploadAttachmentFiles(
  prefix: "projects" | "tasks" | "ideas",
  entityId: string,
  files: File[],
  opts?: { imagesOnly?: boolean }
): Promise<{ ok: true; uploaded: UploadedAttachment[] } | { ok: false; error: string }> {
  if (!files.length) return { ok: false, error: "Выберите хотя бы один файл" };
  if (!isAttachmentUploadConfigured()) {
    return { ok: false, error: "Хранилище не настроено (Supabase Storage)" };
  }

  let sb: ReturnType<typeof createSupabaseServiceClient>;
  try {
    sb = createSupabaseServiceClient();
  } catch {
    return { ok: false, error: "Хранилище не настроено (Supabase Storage)" };
  }

  const bucket = getAttachmentStorageBucket();
  const uploaded: UploadedAttachment[] = [];
  const imagesOnly = opts?.imagesOnly ?? prefix === "ideas";

  for (const file of files) {
    if (file.size <= 0) continue;
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `«${file.name}» больше 50 МБ` };
    }
    const contentType = file.type?.trim() || "application/octet-stream";
    if (imagesOnly && !contentType.startsWith("image/")) {
      return { ok: false, error: `«${file.name}» — нужен файл изображения` };
    }

    const name = sanitizeUploadFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const path = storagePath(prefix, entityId, name);

    const { error } = await sb.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      console.error("Supabase attachment upload", error);
      const msg = error.message || "Ошибка загрузки";
      if (msg.toLowerCase().includes("bucket")) {
        return {
          ok: false,
          error: `Bucket «${bucket}» не найден. Примените миграцию 011 или создайте bucket в Supabase Storage.`,
        };
      }
      return { ok: false, error: `${name}: ${msg}` };
    }

    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl?.trim();
    if (!publicUrl) return { ok: false, error: `Не удалось получить ссылку для «${name}»` };

    uploaded.push({
      name,
      url: publicUrl,
      sizeBytes: file.size,
      kind: fileKindFromName(name),
      contentType,
    });
  }

  if (!uploaded.length) return { ok: false, error: "Выберите хотя бы один файл" };
  return { ok: true, uploaded };
}
