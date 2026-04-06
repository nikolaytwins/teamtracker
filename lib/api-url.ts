/** Prefix for same-origin fetches when the app is served under `basePath` (e.g. /pm-board). */
export function apiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
