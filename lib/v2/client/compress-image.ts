const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;
const SKIP_UNDER_BYTES = 400_000;

/** Сжимает фото для загрузки: меньше 2 МБ, сторона ≤ 1920. GIF и крошечные файлы не трогает. */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < SKIP_UNDER_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function uploadNetworkError(e: unknown, fallback: string): string {
  if (e instanceof TypeError) {
    return "Не удалось загрузить фото — файл слишком большой или оборвалась сеть. Попробуйте одно изображение поменьше.";
  }
  if (e instanceof Error && e.message.trim()) return e.message;
  return fallback;
}
