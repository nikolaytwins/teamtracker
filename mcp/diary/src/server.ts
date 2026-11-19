import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  formatEntry,
  getEntry,
  listEntries,
  listPlatformSections,
  readPlatformSection,
} from "./client.js";

function monthPeriod(month: string): { from: string; to: string } | null {
  const m = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return null;
  const lastDay = new Date(y, mo, 0).getDate();
  return {
    from: `${m[1]}-${m[2]}-01`,
    to: `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function createDiaryMcpServer() {
  const server = new McpServer({
    name: "team-tracker-platform",
    version: "0.2.0",
  });

  server.tool(
    "list_sections",
    "Каталог вкладок Team Tracker, которые можно прочитать через read_section (главная, финансы, гипотезы, цели, важное, статьи, спорт, дневник и др.).",
    {},
    async () => {
      const sections = await listPlatformSections();
      const text =
        sections.length === 0
          ? "Разделы не найдены."
          : sections
              .map((s) => `• ${s.id} — ${s.title}\n  ${s.description}\n  ${s.href}`)
              .join("\n\n");
      return { content: [{ type: "text", text }] };
    },
  );

  server.tool(
    "read_section",
    "Прочитать содержимое вкладки / раздела Team Tracker только на чтение. Сначала вызови list_sections. Для статьи markdown передай slug. Для одной гипотезы — section=hypothesis и id.",
    {
      section: z
        .string()
        .describe(
          "id раздела: home, revenue, plan, finance, hypotheses, goals, important, articles, sport, diary, wishes, wishlist, ideas, life_goals, manifestations, sexuality, moscow, mycode, brand, time, hypothesis, article, life_strategy",
        ),
      q: z.string().optional().describe("Фильтр по тексту внутри раздела"),
      id: z.string().optional().describe("id гипотезы для section=hypothesis"),
      slug: z
        .string()
        .optional()
        .describe("slug статьи: impulse-nexus | rostov-content-plan | rostov-ugc | inner-critic"),
      type: z.string().optional().describe("Для diary: тип записи"),
      from: z.string().optional().describe("YYYY-MM-DD"),
      to: z.string().optional().describe("YYYY-MM-DD"),
      year: z.number().int().optional(),
      month: z.number().int().min(1).max(12).optional(),
      limit: z.number().int().min(1).max(200).optional(),
    },
    async (args) => {
      const data = await readPlatformSection(args);
      const text = `# ${data.title}\n\n${data.text}`.trim();
      return { content: [{ type: "text", text }] };
    },
  );

  server.tool(
    "search_entries",
    "Поиск записей личного дневника Team Tracker по тексту, тегу или типу (не включает выводы — см. search_conclusions).",
    {
      q: z.string().optional().describe("Поиск по заголовку, тексту и тегам"),
      tag: z.string().optional().describe("Тег без #"),
      type: z.string().optional().describe("Тип: loop, chance, market, magnet, person, pattern, place, love, other"),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ q, tag, type, limit }) => {
      const data = await listEntries({ q, tag, type, limit: limit ?? 30 });
      const text =
        data.observations.length === 0
          ? "Записей не найдено."
          : `Найдено ${data.total}, показано ${data.observations.length}:\n\n${data.observations
              .map((o) => formatEntry(o))
              .join("\n\n---\n\n")}`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_entries_by_period",
    "Записи дневника за период. Даты в ISO (YYYY-MM-DD или полный ISO).",
    {
      from: z.string().describe("Начало периода, YYYY-MM-DD"),
      to: z.string().describe("Конец периода, YYYY-MM-DD"),
      tag: z.string().optional(),
      type: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ from, to, tag, type, limit }) => {
      const fromIso = from.length <= 10 ? `${from}T00:00:00.000Z` : from;
      const toIso = to.length <= 10 ? `${to}T23:59:59.999Z` : to;
      const data = await listEntries({ from: fromIso, to: toIso, tag, type, limit: limit ?? 40 });
      const text =
        data.observations.length === 0
          ? `За период ${from} — ${to} записей нет.`
          : `Период ${from} — ${to}. Всего ${data.total}, показано ${data.observations.length}:\n\n${data.observations
              .map((o) => formatEntry(o))
              .join("\n\n---\n\n")}`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_entry",
    "Полный текст одной записи дневника по id.",
    { id: z.string() },
    async ({ id }) => {
      const o = await getEntry(id);
      return { content: [{ type: "text", text: formatEntry(o, { full: true }) }] };
    }
  );

  server.tool(
    "search_conclusions",
    "Месячные выводы дневника (type=conclusion): заголовок и markdown-текст.",
    {
      q: z.string().optional().describe("Поиск по заголовку и тексту"),
      month: z.string().optional().describe("Месяц YYYY-MM, например 2026-08"),
      from: z.string().optional().describe("Начало периода YYYY-MM-DD"),
      to: z.string().optional().describe("Конец периода YYYY-MM-DD"),
      limit: z.number().int().min(1).max(50).optional(),
    },
    async ({ q, month, from, to, limit }) => {
      const period = month ? monthPeriod(month) : null;
      const data = await listEntries({
        q,
        type: "conclusion",
        from: period?.from ?? from,
        to: period?.to ?? to,
        limit: limit ?? 20,
      });
      const text =
        data.observations.length === 0
          ? "Выводов не найдено."
          : `Найдено ${data.total} выводов, показано ${data.observations.length}:\n\n${data.observations
              .map((o) => formatEntry(o, { full: true }))
              .join("\n\n---\n\n")}`;
      return { content: [{ type: "text", text }] };
    }
  );

  server.tool(
    "get_conclusion",
    "Полный markdown одного месячного вывода по id.",
    { id: z.string() },
    async ({ id }) => {
      const o = await getEntry(id);
      if (o.type !== "conclusion") {
        return {
          content: [
            {
              type: "text",
              text: `Запись ${id} — не вывод (type=${o.type}). Используй get_entry.`,
            },
          ],
        };
      }
      return { content: [{ type: "text", text: formatEntry(o, { full: true }) }] };
    }
  );

  server.tool(
    "get_observations",
    "Сводка дневника: записи, популярные теги и счётчики типов. Для выводов месяца — search_conclusions.",
    {
      q: z.string().optional(),
      tag: z.string().optional(),
      type: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async (args) => {
      const from = args.from && args.from.length <= 10 ? `${args.from}T00:00:00.000Z` : args.from;
      const to = args.to && args.to.length <= 10 ? `${args.to}T23:59:59.999Z` : args.to;
      const data = await listEntries({
        q: args.q,
        tag: args.tag,
        type: args.type,
        from,
        to,
        limit: args.limit ?? 40,
      });
      const tags = data.tags.map((t) => `#${t.name} (${t.count})`).join(", ") || "нет";
      const counts = Object.entries(data.counts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const list =
        data.observations.length === 0
          ? "Записей нет."
          : data.observations.map((o) => formatEntry(o)).join("\n\n---\n\n");
      const text = `Всего ${data.total}. Типы: ${counts}.\nТеги: ${tags}\n\n${list}`;
      return { content: [{ type: "text", text }] };
    }
  );

  return server;
}
