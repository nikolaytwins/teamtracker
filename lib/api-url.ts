const basePath = () => process.env.NEXT_PUBLIC_BASE_PATH || "";

/** Prefix for same-origin fetches when the app is served under `basePath` (e.g. /pm-board). */
export function apiUrl(path: string): string {
  const base = basePath();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Client-side path for `Link` / `router.push` under `basePath`. */
export function appPath(path: string): string {
  const base = basePath();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
