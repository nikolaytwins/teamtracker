export type WishMediaType = "image" | "video";

const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v", "ogv", "ogg"]);

export function inferWishMediaType(name: string, hint?: unknown): WishMediaType {
  if (hint === "video" || hint === "image") return hint;
  const ext = name.split(".").pop()?.toLowerCase().trim();
  if (ext && VIDEO_EXT.has(ext)) return "video";
  return "image";
}

export function wishMediaTypeFromFile(file: File): WishMediaType {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return inferWishMediaType(file.name);
}

export function isWishMediaFile(file: File): boolean {
  return (file.type.startsWith("image/") || file.type.startsWith("video/")) && file.size > 0;
}

export function isWishVideoMedia(media: { media_type?: WishMediaType; name?: string; url?: string }): boolean {
  if (media.media_type === "video") return true;
  if (media.media_type === "image") return false;
  return inferWishMediaType(media.name || media.url || "") === "video";
}

export const WISH_MEDIA_ACCEPT = "image/*,video/*";
