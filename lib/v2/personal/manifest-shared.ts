export type ManifestTocItem = {
  id: string;
  label: string;
  short: string;
};

export function slugifyManifestHeading(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

export function shortManifestLabel(heading: string): string {
  const cleaned = heading
    .replace(/^[ivxlc]+\.\s*/i, "")
    .replace(/^манифест\s+/i, "")
    .trim();
  if (cleaned.length <= 38) return cleaned;
  return `${cleaned.slice(0, 36).trim()}…`;
}
