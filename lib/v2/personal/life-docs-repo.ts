import { getV2Supabase, nowIso } from "@/lib/v2/db/client";
import type { V2SessionContext } from "@/lib/v2/types";

export type LifeDocKind = "time" | "brand" | "life_strategy" | "mycode" | "sport";

export class PersonalLifeDocsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PersonalLifeDocsValidationError";
  }
}

export async function loadPersonalLifeDoc<T extends Record<string, unknown>>(
  ctx: V2SessionContext,
  kind: LifeDocKind,
  seed: () => T
): Promise<T> {
  const sb = getV2Supabase();
  const { data, error } = await sb
    .from("v2_personal_life_docs")
    .select("doc")
    .eq("user_id", ctx.userId)
    .eq("kind", kind)
    .maybeSingle();
  if (error) throw error;

  if (data?.doc && typeof data.doc === "object" && !Array.isArray(data.doc)) {
    return data.doc as T;
  }

  const fresh = seed();
  const now = nowIso();
  const { error: upsertErr } = await sb.from("v2_personal_life_docs").upsert(
    {
      user_id: ctx.userId,
      kind,
      doc: fresh,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,kind" }
  );
  if (upsertErr) throw upsertErr;
  return fresh;
}

export async function savePersonalLifeDoc<T extends Record<string, unknown>>(
  ctx: V2SessionContext,
  kind: LifeDocKind,
  doc: T
): Promise<T> {
  if (!doc || typeof doc !== "object") {
    throw new PersonalLifeDocsValidationError("Некорректные данные");
  }
  const sb = getV2Supabase();
  const now = nowIso();
  const { error } = await sb.from("v2_personal_life_docs").upsert(
    {
      user_id: ctx.userId,
      kind,
      doc,
      created_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,kind" }
  );
  if (error) throw error;
  return doc;
}
