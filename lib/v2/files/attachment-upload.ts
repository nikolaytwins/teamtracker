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

type AttachmentPrefix = "projects" | "tasks" | "ideas" | "wishes";

export type AttachmentUploadInput = {
  name: string;
  contentType: string;
  buffer: Buffer;
};

export type AttachmentUploadOpts = {
  imagesOnly?: boolean;
  /** Только image/* и video/* (желания) */
  allowVideo?: boolean;
};

function storagePath(prefix: AttachmentPrefix, entityId: string, filename: string): string {
  const safeEntity = entityId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  const safeName = sanitizeUploadFilename(filename);
  return `${prefix}/${safeEntity}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
}

function isAllowedAttachmentType(contentType: string, opts?: AttachmentUploadOpts): boolean {
  const ct = contentType.toLowerCase();
  if (ct.startsWith("image/")) return true;
  if (opts?.allowVideo) return ct.startsWith("video/");
  if (opts?.imagesOnly ?? false) return false;
  return true;
}

function attachmentTypeError(name: string, opts?: AttachmentUploadOpts): string {
  if (opts?.allowVideo) return `«${name}» — нужен файл изображения или видео`;
  return `«${name}» — нужен файл изображения`;
}

export type SignedAttachmentUpload = {
  name: string;
  path: string;
  token: string;
  signedUrl: string;
  publicUrl: string;
};

export async function createSignedAttachmentUploads(
  prefix: AttachmentPrefix,
  entityId: string,
  files: { name: string; contentType: string }[],
  opts?: AttachmentUploadOpts
): Promise<{ ok: true; uploads: SignedAttachmentUpload[] } | { ok: false; error: string }> {
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
  const imagesOnly = opts?.allowVideo ? false : (opts?.imagesOnly ?? (prefix === "ideas" || prefix === "wishes"));
  const resolvedOpts: AttachmentUploadOpts = { ...opts, imagesOnly };
  const uploads: SignedAttachmentUpload[] = [];

  for (const file of files) {
    const contentType = file.contentType?.trim() || "application/octet-stream";
    if (!isAllowedAttachmentType(contentType, resolvedOpts)) {
      return { ok: false, error: attachmentTypeError(file.name, resolvedOpts) };
    }
    const path = storagePath(prefix, entityId, file.name || "photo.jpg");
    const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.signedUrl || !data.token) {
      console.error("Supabase signed upload url", error);
      return { ok: false, error: error?.message || "Не удалось подготовить загрузку" };
    }
    const { data: pub } = sb.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub?.publicUrl?.trim();
    if (!publicUrl) return { ok: false, error: `Не удалось получить ссылку для «${file.name}»` };
    uploads.push({
      name: sanitizeUploadFilename(file.name || "photo.jpg"),
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl,
    });
  }

  return { ok: true, uploads };
}

export async function uploadAttachmentBuffers(
  prefix: AttachmentPrefix,
  entityId: string,
  files: AttachmentUploadInput[],
  opts?: AttachmentUploadOpts
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
  const imagesOnly = opts?.allowVideo ? false : (opts?.imagesOnly ?? (prefix === "ideas" || prefix === "wishes"));
  const resolvedOpts: AttachmentUploadOpts = { ...opts, imagesOnly };

  for (const file of files) {
    if (file.buffer.length <= 0) continue;
    if (file.buffer.length > MAX_BYTES) {
      return { ok: false, error: `«${file.name}» больше 50 МБ` };
    }
    const contentType = file.contentType?.trim() || "application/octet-stream";
    if (!isAllowedAttachmentType(contentType, resolvedOpts)) {
      return { ok: false, error: attachmentTypeError(file.name, resolvedOpts) };
    }

    const name = sanitizeUploadFilename(file.name);
    const path = storagePath(prefix, entityId, name);

    const { error } = await sb.storage.from(bucket).upload(path, file.buffer, {
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
      sizeBytes: file.buffer.length,
      kind: fileKindFromName(name),
      contentType,
    });
  }

  if (!uploaded.length) return { ok: false, error: "Выберите хотя бы один файл" };
  return { ok: true, uploaded };
}

export async function uploadAttachmentFiles(
  prefix: AttachmentPrefix,
  entityId: string,
  files: Blob[],
  opts?: AttachmentUploadOpts
): Promise<{ ok: true; uploaded: UploadedAttachment[] } | { ok: false; error: string }> {
  const inputs: AttachmentUploadInput[] = [];
  for (const file of files) {
    if (file.size <= 0) continue;
    const name = file instanceof File && file.name ? file.name : "photo.jpg";
    inputs.push({
      name,
      contentType: file.type?.trim() || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
    });
  }
  return uploadAttachmentBuffers(prefix, entityId, inputs, opts);
}
