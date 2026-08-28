import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const USER = "u_be81c9da3f083fcae9d0d614";

function slug(n) {
  return (n || "other")
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
}

const { data: cats } = await sb
  .from("v2_personal_budget_categories")
  .select("*")
  .eq("user_id", USER)
  .eq("year", 2026)
  .eq("month", 8)
  .order("sort_order");

const { data: txns } = await sb
  .from("v2_personal_transactions")
  .select("*")
  .eq("user_id", USER)
  .eq("year", 2026)
  .eq("month", 8)
  .order("txn_date", { ascending: false });

const cm = Object.fromEntries((cats ?? []).map((c) => [c.id, c]));
const rows = [];

for (const t of txns ?? []) {
  if (t.txn_type !== "expense") continue;
  const c = cm[t.budget_category_id];
  const d = String(t.txn_date).slice(0, 10);
  const tm = String(t.txn_date).includes("T") ? String(t.txn_date).slice(11, 16) : "12:00";
  rows.push([
    d,
    tm,
    "out",
    t.description || c?.name || "Расход",
    (c?.name || "") + (t.external_id ? " · " + t.external_id.slice(0, 8) : ""),
    slug(c?.name || "other"),
    Math.round(Number(t.amount_rub)),
    "Т банк карты",
    "paid",
    t.external_id || t.id.slice(0, 12),
  ]);
}

const catDefs = {};
for (const c of cats ?? []) {
  catDefs[slug(c.name)] = { n: c.name, c: c.tint, t: "out" };
}

const ih = [];
for (const m of [6, 7, 8]) {
  const { data: r } = await sb
    .from("v2_personal_income_history")
    .select("earned_rub, spent_rub")
    .eq("user_id", USER)
    .eq("year", 2026)
    .eq("month", m)
    .maybeSingle();
  const { data: tx } = await sb
    .from("v2_personal_transactions")
    .select("amount_rub, txn_type")
    .eq("user_id", USER)
    .eq("year", 2026)
    .eq("month", m);
  const out =
    Math.round((tx ?? []).filter((x) => x.txn_type === "expense").reduce((s, x) => s + Number(x.amount_rub), 0)) ||
    r?.spent_rub ||
    0;
  ih.push({ m: `2026-${String(m).padStart(2, "0")}`, inc: Math.round(r?.earned_rub || 0), out });
}

console.log(JSON.stringify({ rows, catDefs, ih }));
