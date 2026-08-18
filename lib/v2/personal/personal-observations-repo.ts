import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import {
  isObservationType,
  OBSERVATION_LINKS,
  OBSERVATION_TYPE_META,
  type ObservationType,
} from "@/lib/v2/personal/observations-meta";
import type { V2SessionContext } from "@/lib/v2/types";

export class PersonalObservationsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalObservationsValidationError";
  }
}

export type PersonalObservationTag = {
  id: string;
  name: string;
  count: number;
};

export type PersonalObservation = {
  id: string;
  type: ObservationType;
  title: string;
  body: string;
  why: string;
  link_key: string | null;
  tags: string[];
  observed_at: string;
  created_at: string;
  updated_at: string;
};

export type PersonalObservationsBoard = {
  observations: PersonalObservation[];
  tags: PersonalObservationTag[];
  counts: Record<string, number>;
};

export type ObservationListFilter = {
  type?: ObservationType | "all";
  linkKey?: string | "all";
  tag?: string | null;
  q?: string;
  from?: string | null;
  to?: string | null;
};

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function normalizeTagName(raw: string): string {
  return raw.trim().replace(/^#/, "").replace(/\s+/g, " ").toLowerCase().slice(0, 48);
}

function mapObs(
  r: Record<string, unknown>,
  tags: string[]
): PersonalObservation {
  const typeRaw = String(r.obs_type || "other");
  return {
    id: String(r.id),
    type: isObservationType(typeRaw) ? typeRaw : "other",
    title: String(r.title || ""),
    body: String(r.body || ""),
    why: String(r.why || ""),
    link_key: r.link_key ? String(r.link_key) : null,
    tags,
    observed_at: String(r.observed_at),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  };
}

async function listTagsRaw(userId: string): Promise<Record<string, unknown>[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_observation_tags")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

export async function ensureObservationTag(
  ctx: V2SessionContext,
  nameRaw: string
): Promise<{ id: string; name: string }> {
  const name = normalizeTagName(nameRaw);
  if (!name) throw new PersonalObservationsValidationError("Укажите название тега");
  const userId = uid(ctx);
  const existing = await listTagsRaw(userId);
  const found = existing.find((t) => String(t.name).toLowerCase() === name);
  if (found) return { id: String(found.id), name: String(found.name) };

  const sb = getV2Supabase();
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    name,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_observation_tags").insert(row);
  if (error) {
    const again = await listTagsRaw(userId);
    const hit = again.find((t) => String(t.name).toLowerCase() === name);
    if (hit) return { id: String(hit.id), name: String(hit.name) };
    throw error;
  }
  return { id: row.id, name };
}

async function setObservationTags(
  ctx: V2SessionContext,
  observationId: string,
  tagNames: string[]
) {
  const sb = getV2Supabase();
  const { error: delErr } = await sb
    .from("v2_personal_observation_tag_links")
    .delete()
    .eq("observation_id", observationId);
  if (delErr) throw delErr;

  const unique = Array.from(
    new Set(tagNames.map(normalizeTagName).filter(Boolean))
  ).slice(0, 24);
  if (!unique.length) return;

  const tagRows = [];
  for (const name of unique) {
    tagRows.push(await ensureObservationTag(ctx, name));
  }
  const { error } = await sb.from("v2_personal_observation_tag_links").insert(
    tagRows.map((t) => ({ observation_id: observationId, tag_id: t.id }))
  );
  if (error) throw error;
}

async function loadTagMap(
  observationIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!observationIds.length) return map;
  const sb = getV2Supabase();
  const { data: links, error } = await sb
    .from("v2_personal_observation_tag_links")
    .select("observation_id, tag_id")
    .in("observation_id", observationIds);
  if (error) throw error;
  const tagIds = Array.from(
    new Set((links ?? []).map((l) => String((l as { tag_id: string }).tag_id)))
  );
  if (!tagIds.length) return map;
  const { data: tags, error: tagErr } = await sb
    .from("v2_personal_observation_tags")
    .select("id, name")
    .in("id", tagIds);
  if (tagErr) throw tagErr;
  const nameById = new Map(
    (tags ?? []).map((t) => [String((t as { id: string }).id), String((t as { name: string }).name)])
  );
  for (const row of links ?? []) {
    const oid = String((row as { observation_id: string }).observation_id);
    const tid = String((row as { tag_id: string }).tag_id);
    const name = nameById.get(tid);
    if (!name) continue;
    const list = map.get(oid) ?? [];
    list.push(name);
    map.set(oid, list);
  }
  return map;
}

function matchesFilter(o: PersonalObservation, f: ObservationListFilter): boolean {
  if (f.type && f.type !== "all" && o.type !== f.type) return false;
  if (f.linkKey && f.linkKey !== "all" && o.link_key !== f.linkKey) return false;
  if (f.tag && !o.tags.includes(f.tag)) return false;
  if (f.from) {
    const from = new Date(f.from).getTime();
    if (!Number.isNaN(from) && new Date(o.observed_at).getTime() < from) return false;
  }
  if (f.to) {
    const to = new Date(f.to).getTime();
    if (!Number.isNaN(to) && new Date(o.observed_at).getTime() > to) return false;
  }
  if (f.q?.trim()) {
    const q = f.q.trim().toLowerCase();
    const hay = `${o.title} ${o.body} ${o.why} ${o.tags.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export async function loadPersonalObservationsBoard(
  ctx: V2SessionContext,
  filter: ObservationListFilter = {}
): Promise<PersonalObservationsBoard> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_observations")
    .select("*")
    .eq("user_id", userId)
    .order("observed_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const tagMap = await loadTagMap(rows.map((r) => String(r.id)));
  const all = rows.map((r) => mapObs(r, tagMap.get(String(r.id)) ?? []));

  const counts: Record<string, number> = { all: all.length };
  for (const o of all) {
    counts[o.type] = (counts[o.type] || 0) + 1;
  }

  const catalog = await listTagsRaw(userId);
  const tagCountMap = new Map<string, number>();
  for (const row of catalog) {
    tagCountMap.set(String(row.name), 0);
  }
  for (const o of all) {
    for (const t of o.tags) {
      tagCountMap.set(t, (tagCountMap.get(t) || 0) + 1);
    }
  }
  const tags: PersonalObservationTag[] = Array.from(tagCountMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([name, count]) => ({ id: name, name, count }));

  const observations = all.filter((o) => matchesFilter(o, filter));
  return { observations, tags, counts };
}

export async function getPersonalObservation(
  ctx: V2SessionContext,
  id: string
): Promise<PersonalObservation | null> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_observations")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const tagMap = await loadTagMap([id]);
  return mapObs(data as Record<string, unknown>, tagMap.get(id) ?? []);
}

export async function createPersonalObservation(
  ctx: V2SessionContext,
  input: {
    type?: string;
    title?: string;
    body?: string;
    why?: string;
    linkKey?: string | null;
    tagNames?: string[];
    observedAt?: string | null;
  }
): Promise<PersonalObservation> {
  const body = String(input.body ?? "").trim();
  if (!body) throw new PersonalObservationsValidationError("Напишите, что произошло");
  const typeRaw = String(input.type || "other");
  if (!isObservationType(typeRaw)) {
    throw new PersonalObservationsValidationError("Неизвестный тип записи");
  }
  let linkKey: string | null = input.linkKey ? String(input.linkKey) : null;
  if (linkKey && !OBSERVATION_LINKS[linkKey]) {
    throw new PersonalObservationsValidationError("Неизвестная связь");
  }
  const title =
    String(input.title ?? "").trim() ||
    body.split("\n").map((l) => l.trim()).find(Boolean)?.slice(0, 90) ||
    "Запись";
  const why = String(input.why ?? "").trim();
  const observedAt = input.observedAt ? new Date(input.observedAt) : new Date();
  if (Number.isNaN(observedAt.getTime())) {
    throw new PersonalObservationsValidationError("Некорректная дата");
  }

  const userId = uid(ctx);
  const now = nowIso();
  const id = newV2Id();
  const row = {
    id,
    user_id: userId,
    obs_type: typeRaw,
    title,
    body,
    why,
    link_key: linkKey,
    observed_at: observedAt.toISOString(),
    created_at: now,
    updated_at: now,
  };
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_observations").insert(row);
  if (error) throw error;
  await setObservationTags(ctx, id, input.tagNames ?? []);
  const tagMap = await loadTagMap([id]);
  return mapObs(row, tagMap.get(id) ?? []);
}

export async function updatePersonalObservation(
  ctx: V2SessionContext,
  id: string,
  input: {
    type?: string;
    title?: string;
    body?: string;
    why?: string;
    linkKey?: string | null;
    tagNames?: string[];
    observedAt?: string | null;
  }
): Promise<PersonalObservation> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const { data: existing, error: loadErr } = await sb
    .from("v2_personal_observations")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (loadErr) throw loadErr;
  if (!existing) throw new PersonalObservationsValidationError("Запись не найдена");

  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.type != null) {
    const typeRaw = String(input.type);
    if (!isObservationType(typeRaw)) {
      throw new PersonalObservationsValidationError("Неизвестный тип записи");
    }
    patch.obs_type = typeRaw;
  }
  if (input.title != null) patch.title = String(input.title).trim();
  if (input.body != null) {
    const body = String(input.body).trim();
    if (!body) throw new PersonalObservationsValidationError("Напишите, что произошло");
    patch.body = body;
  }
  if (input.why != null) patch.why = String(input.why).trim();
  if (input.linkKey !== undefined) {
    const linkKey = input.linkKey ? String(input.linkKey) : null;
    if (linkKey && !OBSERVATION_LINKS[linkKey]) {
      throw new PersonalObservationsValidationError("Неизвестная связь");
    }
    patch.link_key = linkKey;
  }
  if (input.observedAt != null) {
    const d = new Date(input.observedAt);
    if (Number.isNaN(d.getTime())) {
      throw new PersonalObservationsValidationError("Некорректная дата");
    }
    patch.observed_at = d.toISOString();
  }

  const { data, error } = await sb
    .from("v2_personal_observations")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  if (input.tagNames !== undefined) await setObservationTags(ctx, id, input.tagNames);
  const tagMap = await loadTagMap([id]);
  return mapObs(data as Record<string, unknown>, tagMap.get(id) ?? []);
}

export async function deletePersonalObservation(ctx: V2SessionContext, id: string) {
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_observations")
    .delete()
    .eq("user_id", uid(ctx))
    .eq("id", id);
  if (error) throw error;
}

export type ObservationExportItem = {
  id: string;
  observed_at: string;
  type: ObservationType;
  type_label: string;
  title: string;
  body: string;
  why: string;
  tags: string[];
  link_key: string | null;
  link_label: string | null;
};

export async function exportPersonalObservations(
  ctx: V2SessionContext,
  filter: ObservationListFilter
): Promise<{ exported_at: string; filter: ObservationListFilter; count: number; items: ObservationExportItem[] }> {
  const board = await loadPersonalObservationsBoard(ctx, filter);
  const items: ObservationExportItem[] = board.observations.map((o) => ({
    id: o.id,
    observed_at: o.observed_at,
    type: o.type,
    type_label: OBSERVATION_TYPE_META[o.type].label,
    title: o.title,
    body: o.body,
    why: o.why,
    tags: o.tags,
    link_key: o.link_key,
    link_label: o.link_key ? OBSERVATION_LINKS[o.link_key]?.label ?? o.link_key : null,
  }));
  return {
    exported_at: nowIso(),
    filter,
    count: items.length,
    items,
  };
}

export function formatObservationsExportMarkdown(
  payload: Awaited<ReturnType<typeof exportPersonalObservations>>
): string {
  const lines: string[] = [
    `# Дневник — экспорт`,
    ``,
    `Экспортировано: ${payload.exported_at}`,
    `Записей: ${payload.count}`,
  ];
  if (payload.filter.from || payload.filter.to) {
    lines.push(
      `Период: ${payload.filter.from ?? "…"} — ${payload.filter.to ?? "…"}`
    );
  }
  if (payload.filter.type && payload.filter.type !== "all") {
    lines.push(`Тип: ${payload.filter.type}`);
  }
  if (payload.filter.tag) lines.push(`Тег: #${payload.filter.tag}`);
  if (payload.filter.linkKey && payload.filter.linkKey !== "all") {
    lines.push(`Связь: ${payload.filter.linkKey}`);
  }
  lines.push(``, `---`, ``);

  for (const it of payload.items) {
    lines.push(`## ${it.title}`);
    lines.push(``);
    lines.push(`- Дата: ${it.observed_at}`);
    lines.push(`- Тип: ${it.type_label} (${it.type})`);
    if (it.tags.length) lines.push(`- Теги: ${it.tags.map((t) => `#${t}`).join(", ")}`);
    if (it.link_label) lines.push(`- Связь: ${it.link_label}`);
    if (it.why) lines.push(`- Почему интересно: ${it.why}`);
    lines.push(``, it.body, ``, `---`, ``);
  }
  return lines.join("\n");
}
