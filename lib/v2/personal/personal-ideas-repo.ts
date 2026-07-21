import { getV2Supabase, newV2Id, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";

export class PersonalIdeasValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalIdeasValidationError";
  }
}

export type PersonalIdeaTag = {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  idea_count: number;
};

export type PersonalIdeaImage = {
  id: string;
  idea_id: string;
  url: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type PersonalIdea = {
  id: string;
  title: string;
  body: string;
  accent: string;
  pinned: boolean;
  tags: PersonalIdeaTag[];
  images: PersonalIdeaImage[];
  created_at: string;
  updated_at: string;
};

export type PersonalIdeasBoard = {
  ideas: PersonalIdea[];
  tags: PersonalIdeaTag[];
};

const TAG_COLORS = ["#FDE68A", "#BFDBFE", "#FECACA", "#E9D5FF", "#FED7AA", "#BBF7D0", "#FBCFE8", "#A5F3FC"];
const CARD_ACCENTS = ["#FEF3C7", "#DBEAFE", "#FEE2E2", "#F3E8FF", "#FFEDD5", "#DCFCE7", "#FCE7F3", "#CFFAFE"];

function uid(ctx: V2SessionContext) {
  return ctx.userId;
}

function mapTag(r: Record<string, unknown>, idea_count = 0): PersonalIdeaTag {
  return {
    id: String(r.id),
    name: String(r.name),
    color: String(r.color || TAG_COLORS[0]),
    sort_order: Number(r.sort_order) || 0,
    idea_count,
  };
}

function mapImage(r: Record<string, unknown>): PersonalIdeaImage {
  return {
    id: String(r.id),
    idea_id: String(r.idea_id),
    url: String(r.url),
    name: String(r.name || ""),
    sort_order: Number(r.sort_order) || 0,
    created_at: String(r.created_at),
  };
}

function normalizeTagName(raw: string): string {
  return raw.trim().replace(/^#/, "").replace(/\s+/g, " ").slice(0, 48);
}

function pickColor(palette: string[], index: number): string {
  return palette[index % palette.length]!;
}

async function listTagsRaw(userId: string): Promise<Record<string, unknown>[]> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_idea_tags")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

export async function ensureIdeaTag(
  ctx: V2SessionContext,
  nameRaw: string
): Promise<PersonalIdeaTag> {
  const name = normalizeTagName(nameRaw);
  if (!name) throw new PersonalIdeasValidationError("Укажите название тега");

  const userId = uid(ctx);
  const existing = await listTagsRaw(userId);
  const found = existing.find((t) => String(t.name).toLowerCase() === name.toLowerCase());
  if (found) return mapTag(found);

  const sb = getV2Supabase();
  const now = nowIso();
  const row = {
    id: newV2Id(),
    user_id: userId,
    name,
    color: pickColor(TAG_COLORS, existing.length),
    sort_order: existing.length,
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_idea_tags").insert(row);
  if (error) {
    // Гонка / unique lower(name) — перечитаем
    const again = await listTagsRaw(userId);
    const retry = again.find((t) => String(t.name).toLowerCase() === name.toLowerCase());
    if (retry) return mapTag(retry);
    throw error;
  }
  return mapTag(row);
}

async function setIdeaTagNames(
  ctx: V2SessionContext,
  ideaId: string,
  tagNames: string[]
): Promise<void> {
  const sb = getV2Supabase();
  const { error: delErr } = await sb.from("v2_personal_idea_tag_links").delete().eq("idea_id", ideaId);
  if (delErr) throw delErr;

  const seen = new Set<string>();
  const links: { idea_id: string; tag_id: string }[] = [];
  for (const raw of tagNames) {
    const name = normalizeTagName(raw);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const tag = await ensureIdeaTag(ctx, name);
    links.push({ idea_id: ideaId, tag_id: tag.id });
  }
  if (!links.length) return;

  const { error } = await sb.from("v2_personal_idea_tag_links").insert(links);
  if (error) throw error;
}

async function ownIdea(userId: string, ideaId: string): Promise<boolean> {
  const sb = getV2Supabase();
  const { data } = await sb
    .from("v2_personal_ideas")
    .select("id")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function loadPersonalIdeasBoard(ctx: V2SessionContext): Promise<PersonalIdeasBoard> {
  const sb = getV2Supabase();
  const userId = uid(ctx);

  const [ideasRes, tagsRaw] = await Promise.all([
    sb
      .from("v2_personal_ideas")
      .select("*")
      .eq("user_id", userId)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false }),
    listTagsRaw(userId),
  ]);
  if (ideasRes.error) throw ideasRes.error;

  const ideasRows = (ideasRes.data ?? []) as Record<string, unknown>[];
  const ideaIdList = ideasRows.map((r) => String(r.id));

  const [linksRes, imagesRes] = ideaIdList.length
    ? await Promise.all([
        sb.from("v2_personal_idea_tag_links").select("idea_id, tag_id").in("idea_id", ideaIdList),
        sb
          .from("v2_personal_idea_images")
          .select("*")
          .in("idea_id", ideaIdList)
          .order("sort_order")
          .order("created_at"),
      ])
    : [
        { data: [] as { idea_id: string; tag_id: string }[], error: null },
        { data: [] as Record<string, unknown>[], error: null },
      ];

  if (linksRes.error) throw linksRes.error;
  if (imagesRes.error) throw imagesRes.error;

  const tagById = new Map(tagsRaw.map((t) => [String(t.id), t]));
  const links = linksRes.data ?? [];
  const counts = new Map<string, number>();
  const tagsByIdea = new Map<string, PersonalIdeaTag[]>();

  for (const link of links) {
    const ideaId = String(link.idea_id);
    const tagId = String(link.tag_id);
    const tagRow = tagById.get(tagId);
    if (!tagRow) continue;
    counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    const list = tagsByIdea.get(ideaId) ?? [];
    list.push(mapTag(tagRow));
    tagsByIdea.set(ideaId, list);
  }

  const imagesByIdea = new Map<string, PersonalIdeaImage[]>();
  for (const img of imagesRes.data ?? []) {
    const ideaId = String((img as Record<string, unknown>).idea_id);
    const list = imagesByIdea.get(ideaId) ?? [];
    list.push(mapImage(img as Record<string, unknown>));
    imagesByIdea.set(ideaId, list);
  }

  const tags: PersonalIdeaTag[] = tagsRaw.map((t) => mapTag(t, counts.get(String(t.id)) ?? 0));

  const ideas: PersonalIdea[] = ideasRows.map((r) => {
    const id = String(r.id);
    return {
      id,
      title: String(r.title || ""),
      body: String(r.body || ""),
      accent: String(r.accent || CARD_ACCENTS[0]),
      pinned: Boolean(r.pinned),
      tags: tagsByIdea.get(id) ?? [],
      images: imagesByIdea.get(id) ?? [],
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    };
  });

  return { ideas, tags };
}

export async function createPersonalIdea(
  ctx: V2SessionContext,
  input: {
    title?: string;
    body?: string;
    accent?: string;
    pinned?: boolean;
    tagNames?: string[];
  }
): Promise<PersonalIdea> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const now = nowIso();
  const title = (input.title ?? "").trim() || "Без названия";
  const body = (input.body ?? "").trim();
  const { count } = await sb
    .from("v2_personal_ideas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const row = {
    id: newV2Id(),
    user_id: userId,
    title,
    body,
    accent: input.accent?.trim() || pickColor(CARD_ACCENTS, count ?? 0),
    pinned: Boolean(input.pinned),
    created_at: now,
    updated_at: now,
  };
  const { error } = await sb.from("v2_personal_ideas").insert(row);
  if (error) throw error;

  if (input.tagNames?.length) {
    await setIdeaTagNames(ctx, row.id, input.tagNames);
  }

  const board = await loadPersonalIdeasBoard(ctx);
  const idea = board.ideas.find((i) => i.id === row.id);
  if (!idea) throw new PersonalIdeasValidationError("Не удалось создать идею");
  return idea;
}

export async function updatePersonalIdea(
  ctx: V2SessionContext,
  id: string,
  input: {
    title?: string;
    body?: string;
    accent?: string;
    pinned?: boolean;
    tagNames?: string[];
  }
): Promise<PersonalIdea> {
  const userId = uid(ctx);
  if (!(await ownIdea(userId, id))) {
    throw new PersonalIdeasValidationError("Идея не найдена");
  }

  const sb = getV2Supabase();
  const patch: Record<string, unknown> = { updated_at: nowIso() };
  if (input.title !== undefined) patch.title = input.title.trim() || "Без названия";
  if (input.body !== undefined) patch.body = input.body;
  if (input.accent !== undefined) patch.accent = input.accent.trim() || CARD_ACCENTS[0];
  if (input.pinned !== undefined) patch.pinned = Boolean(input.pinned);

  const { error } = await sb.from("v2_personal_ideas").update(patch).eq("id", id).eq("user_id", userId);
  if (error) throw error;

  if (input.tagNames !== undefined) {
    await setIdeaTagNames(ctx, id, input.tagNames);
  }

  const board = await loadPersonalIdeasBoard(ctx);
  const idea = board.ideas.find((i) => i.id === id);
  if (!idea) throw new PersonalIdeasValidationError("Идея не найдена");
  return idea;
}

export async function deletePersonalIdea(ctx: V2SessionContext, id: string): Promise<void> {
  const userId = uid(ctx);
  const sb = getV2Supabase();
  const { error } = await sb.from("v2_personal_ideas").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function addPersonalIdeaImages(
  ctx: V2SessionContext,
  ideaId: string,
  files: { url: string; name: string }[]
): Promise<PersonalIdeaImage[]> {
  const userId = uid(ctx);
  if (!(await ownIdea(userId, ideaId))) {
    throw new PersonalIdeasValidationError("Идея не найдена");
  }
  if (!files.length) throw new PersonalIdeasValidationError("Нет файлов");

  const sb = getV2Supabase();
  const { data: existing } = await sb
    .from("v2_personal_idea_images")
    .select("sort_order")
    .eq("idea_id", ideaId)
    .order("sort_order", { ascending: false })
    .limit(1);
  let sort = existing?.[0] ? Number(existing[0].sort_order) + 1 : 0;
  const now = nowIso();
  const rows = files.map((f) => ({
    id: newV2Id(),
    idea_id: ideaId,
    url: f.url,
    name: f.name,
    sort_order: sort++,
    created_at: now,
  }));
  const { error } = await sb.from("v2_personal_idea_images").insert(rows);
  if (error) throw error;

  await sb
    .from("v2_personal_ideas")
    .update({ updated_at: now })
    .eq("id", ideaId)
    .eq("user_id", userId);

  return rows.map((r) => mapImage(r));
}

export async function deletePersonalIdeaImage(
  ctx: V2SessionContext,
  ideaId: string,
  imageId: string
): Promise<void> {
  const userId = uid(ctx);
  if (!(await ownIdea(userId, ideaId))) {
    throw new PersonalIdeasValidationError("Идея не найдена");
  }
  const sb = getV2Supabase();
  const { error } = await sb
    .from("v2_personal_idea_images")
    .delete()
    .eq("id", imageId)
    .eq("idea_id", ideaId);
  if (error) throw error;
  await sb
    .from("v2_personal_ideas")
    .update({ updated_at: nowIso() })
    .eq("id", ideaId)
    .eq("user_id", userId);
}
