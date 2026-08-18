const DEFAULT_API = "https://tt.twinlabs.ru/api/integrations/sophia/diary";

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

function apiUrl() {
  return (process.env.TT_DIARY_API_URL || DEFAULT_API).trim();
}

function secret() {
  return (process.env.TT_INTEGRATION_SECRET || "").trim();
}

async function diaryFetch(pathQuery: string): Promise<Response> {
  const token = secret();
  if (token.length < 16) {
    throw new Error("TT_INTEGRATION_SECRET не задан");
  }
  const url = `${apiUrl()}${pathQuery}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-tt-integration-secret": token,
    },
  });
  return res;
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
  const body = full ? o.body : o.body.length > 420 ? `${o.body.slice(0, 420)}…` : o.body;
  const why = o.why ? `\nПочему: ${o.why}` : "";
  return [
    `${o.observed_at.slice(0, 10)} · ${o.type} · ${o.title}`,
    `id: ${o.id}`,
    `теги: ${tags}`,
    body,
    why,
  ]
    .filter(Boolean)
    .join("\n");
}
