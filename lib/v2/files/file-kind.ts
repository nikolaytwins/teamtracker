export function fileKindFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase().trim();
  if (!ext || ext === name.toLowerCase()) return "file";
  return ext.slice(0, 12);
}

/** ASCII-only object key for Supabase Storage (Cyrillic/spaces → rejected as Invalid key). */
export function sanitizeUploadFilename(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || "file";
  const lastDot = base.lastIndexOf(".");
  const extRaw = lastDot > 0 ? base.slice(lastDot + 1) : "";
  const stemRaw = lastDot > 0 ? base.slice(0, lastDot) : base;
  const stem =
    stemRaw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "file";
  const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toLowerCase();
  return ext ? `${stem}.${ext}` : stem;
}
