const DEFAULT_API = "https://tt.twinlabs.ru/api/integrations/sophia/diary";
const DEFAULT_PLATFORM_API = "https://tt.twinlabs.ru/api/integrations/sophia/platform";

export type DiaryObservation = {
  id: string;
  type: string;
  title: string;
  body: string;
  why: string;
  tags: string[];
  observed_at: string;
  link_key: string | null;
};

export type DiaryList = {
  ok: boolean;
  total: number;
  observations: DiaryObservation[];
  tags: Array<{ name: string; count: number }>;
  counts: Record<string, number>;
};

export type PlatformSection = {
  id: string;
  title: string;
  href: string;
  description: string;
};

function apiUrl() {
  return (process.env.TT_DIARY_API_URL || DEFAULT_API).trim();
}

function platformApiUrl() {
  return (process.env.TT_PLATFORM_API_URL || DEFAULT_PLATFORM_API).trim();
}

function secret() {
  return (process.env.TT_INTEGRATION_SECRET || "").trim();
}

async function authFetch(url: string): Promise<Response> {
  const token = secret();
  if (token.length < 16) {
    throw new Error("TT_INTEGRATION_SECRET не задан");
  }
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tt-integration-secret": token,
    },
  });
}

async function diaryFetch(pathQuery: string): Promise<Response> {
  return authFetch(`${apiUrl()}${pathQuery}`);
}

export async function listEntries(params: {
  q?: string;
  from?: string;
  to?: string;
  tag?: string;
  type?: string;
  limit?: number;
}): Promise<DiaryList> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.tag) sp.set("tag", params.tag.replace(/^#/, ""));
  if (params.type) sp.set("type", params.type);
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString() ? `?${sp}` : "";
  const res = await diaryFetch(qs);
  const data = (await res.json()) as DiaryList & { error?: string };
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data;
}

export async function getEntry(id: string): Promise<DiaryObservation> {
  const res = await diaryFetch(`?id=${encodeURIComponent(id)}`);
  const data = (await res.json()) as { observation?: DiaryObservation; error?: string };
  if (!res.ok || !data.observation) throw new Error(data.error || `API ${res.status}`);
  return data.observation;
}

export function formatEntry(o: DiaryObservation, { full = false } = {}): string {
  const tags = o.tags.length ? o.tags.map((t) => `#${t}`).join(" ") : "—";
  const isConclusion = o.type === "conclusion";
  const previewLimit = isConclusion ? 900 : 420;
  const body = full ? o.body : o.body.length > previewLimit ? `${o.body.slice(0, previewLimit)}…` : o.body;
  const why = o.why ? `\nПочему: ${o.why}` : "";
  const kind = isConclusion ? "вывод" : o.type;
  return [
    `${o.observed_at.slice(0, 10)} · ${kind} · ${o.title}`,
    `id: ${o.id}`,
    `теги: ${tags}`,
    body,
    why,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function listPlatformSections(): Promise<PlatformSection[]> {
  const res = await authFetch(`${platformApiUrl()}?list=1`);
  const data = (await res.json()) as { sections?: PlatformSection[]; error?: string };
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return data.sections ?? [];
}

export async function readPlatformSection(params: {
  section: string;
  q?: string;
  id?: string;
  slug?: string;
  type?: string;
  from?: string;
  to?: string;
  year?: number;
  month?: number;
  limit?: number;
}): Promise<{ section: string; title: string; text: string }> {
  const sp = new URLSearchParams();
  sp.set("section", params.section);
  if (params.q) sp.set("q", params.q);
  if (params.id) sp.set("id", params.id);
  if (params.slug) sp.set("slug", params.slug);
  if (params.type) sp.set("type", params.type);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.year != null) sp.set("year", String(params.year));
  if (params.month != null) sp.set("month", String(params.month));
  if (params.limit != null) sp.set("limit", String(params.limit));
  const res = await authFetch(`${platformApiUrl()}?${sp}`);
  const data = (await res.json()) as {
    section?: string;
    title?: string;
    text?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || `API ${res.status}`);
  return {
    section: data.section || params.section,
    title: data.title || params.section,
    text: data.text || "",
  };
}
