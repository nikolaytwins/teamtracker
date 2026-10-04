import { getV2Supabase } from "@/lib/v2/db/client";
import {
  INBOX_CATEGORIES,
  isInboxCategory,
  type InboxCategory,
} from "@/lib/v2/personal/inbox-categories";

export async function listInboxCategories(): Promise<InboxCategory[]> {
  try {
    const sb = getV2Supabase();
    const { data, error } = await sb
      .from("v2_personal_todo_inbox_categories")
      .select("id, label, description, color, bg, shortcut, sort_order")
      .order("sort_order");
    if (error) throw error;
    const rows = (data ?? [])
      .map((r) => {
        if (!isInboxCategory(r.id)) return null;
        return {
          id: r.id,
          label: String(r.label ?? ""),
          description: String(r.description ?? ""),
          color: String(r.color ?? "#71717A"),
          bg: String(r.bg ?? ""),
          shortcut: String(r.shortcut ?? ""),
          sort_order: Number(r.sort_order) || 0,
        } satisfies InboxCategory;
      })
      .filter((r): r is InboxCategory => Boolean(r));
    return rows.length ? rows : INBOX_CATEGORIES;
  } catch {
    return INBOX_CATEGORIES;
  }
}
