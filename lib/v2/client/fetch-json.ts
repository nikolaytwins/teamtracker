import { apiUrl } from "@/lib/api-url";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";

const CLIENT_FETCH_TIMEOUT_MS = 30_000;

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithTimeout(apiUrl(path), { ...init, credentials: "include" }, CLIENT_FETCH_TIMEOUT_MS);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
}
