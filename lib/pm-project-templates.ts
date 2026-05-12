import { getDb } from "@/lib/db";
import { createSubtask } from "@/lib/pm-subtasks";

export type PmProjectTemplateRow = {
  id: string;
  name: string;
  created_at: string;
};

export type PmProjectTemplateItemRow = {
  id: string;
  template_id: string;
  title: string;
  sort_order: number;
  estimated_hours: number | null;
};

export type ProjectTemplateWithItems = PmProjectTemplateRow & {
  items: PmProjectTemplateItemRow[];
};

export function listProjectTemplates(): (PmProjectTemplateRow & { itemCount: number })[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT t.id, t.name, t.created_at,
              (SELECT COUNT(*) FROM pm_project_template_items i WHERE i.template_id = t.id) AS item_count
       FROM pm_project_templates t
       ORDER BY t.name ASC`
    )
    .all() as { id: string; name: string; created_at: string; item_count: number }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    created_at: r.created_at,
    itemCount: Number(r.item_count) || 0,
  }));
}

export function getProjectTemplate(templateId: string): ProjectTemplateWithItems | null {
  const id = templateId.trim();
  if (!id) return null;
  const db = getDb();
  const t = db.prepare(`SELECT * FROM pm_project_templates WHERE id = ?`).get(id) as PmProjectTemplateRow | undefined;
  if (!t) return null;
  const items = db
    .prepare(
      `SELECT * FROM pm_project_template_items WHERE template_id = ? ORDER BY sort_order ASC`
    )
    .all(id) as PmProjectTemplateItemRow[];
  return { ...t, items };
}

export function createProjectTemplate(params: {
  name: string;
  items?: { title: string; estimatedHours?: number | null }[];
}): ProjectTemplateWithItems {
  const db = getDb();
  const tid = `ptpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const name = params.name.trim();
  db.prepare(`INSERT INTO pm_project_templates (id, name) VALUES (?, ?)`).run(tid, name || "Шаблон");
  const items = params.items?.filter((x) => x.title.trim()) ?? [];
  let order = 0;
  for (const it of items) {
    const iid = `pti_${Date.now()}_${order}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(
      `INSERT INTO pm_project_template_items (id, template_id, title, sort_order, estimated_hours) VALUES (?, ?, ?, ?, ?)`
    ).run(
      iid,
      tid,
      it.title.trim(),
      order++,
      it.estimatedHours != null && !Number.isNaN(Number(it.estimatedHours)) ? Number(it.estimatedHours) : null
    );
  }
  return getProjectTemplate(tid)!;
}

export function updateProjectTemplate(
  templateId: string,
  updates: {
    name?: string;
    items?: { title: string; estimatedHours?: number | null }[];
  }
): ProjectTemplateWithItems | null {
  const id = templateId.trim();
  if (!id) return null;
  const db = getDb();
  const cur = db.prepare(`SELECT id FROM pm_project_templates WHERE id = ?`).get(id);
  if (!cur) return null;
  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (name) db.prepare(`UPDATE pm_project_templates SET name = ? WHERE id = ?`).run(name, id);
  }
  if (updates.items !== undefined) {
    db.prepare(`DELETE FROM pm_project_template_items WHERE template_id = ?`).run(id);
    let order = 0;
    for (const it of updates.items) {
      if (!it.title.trim()) continue;
      const iid = `pti_${Date.now()}_${order}_${Math.random().toString(36).slice(2, 6)}`;
      db.prepare(
        `INSERT INTO pm_project_template_items (id, template_id, title, sort_order, estimated_hours) VALUES (?, ?, ?, ?, ?)`
      ).run(
        iid,
        id,
        it.title.trim(),
        order++,
        it.estimatedHours != null && !Number.isNaN(Number(it.estimatedHours)) ? Number(it.estimatedHours) : null
      );
    }
  }
  return getProjectTemplate(id);
}

export function deleteProjectTemplate(templateId: string): boolean {
  const id = templateId.trim();
  if (!id) return false;
  const db = getDb();
  db.prepare(`DELETE FROM pm_project_template_items WHERE template_id = ?`).run(id);
  const r = db.prepare(`DELETE FROM pm_project_templates WHERE id = ?`).run(id);
  return r.changes > 0;
}

/** Создаёт подзадачи по шаблону. Возвращает количество созданных. */
export function applyProjectTemplateToCard(cardId: string, templateId: string): number {
  const tpl = getProjectTemplate(templateId);
  if (!tpl || tpl.items.length === 0) return 0;
  let n = 0;
  for (const it of tpl.items) {
    const sub = createSubtask({
      cardId,
      title: it.title,
      estimatedHours: it.estimated_hours,
    });
    if (sub) n++;
  }
  return n;
}
