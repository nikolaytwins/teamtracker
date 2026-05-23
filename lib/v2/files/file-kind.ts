export function fileKindFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase().trim();
  if (!ext || ext === name.toLowerCase()) return "file";
  return ext.slice(0, 12);
}

export function sanitizeUploadFilename(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || "file";
  const cleaned = base.replace(/[^\w.\-()+\s\u0400-\u04FF]/g, "_").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 120) || "file";
}
