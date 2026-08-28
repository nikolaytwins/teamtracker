import { apiUrl } from "@/lib/api-url";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const CLIENT_FETCH_TIMEOUT_MS = 30_000;
export const IMPORT_FETCH_TIMEOUT_MS = 120_000;

export async function fetchJson<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = CLIENT_FETCH_TIMEOUT_MS
): Promise<T> {
  const res = await fetchWithTimeout(apiUrl(path), { ...init, credentials: "include" }, timeoutMs);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}
