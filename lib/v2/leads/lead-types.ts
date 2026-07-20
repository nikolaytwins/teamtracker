export type V2LeadStatus =
  | "correspondence"
  | "thinking"
  | "taken_into_work"
  | "awaiting_start"
  | "pause"
  | "lost";
export type V2LeadType = "agency" | "course";
export type V2LeadSource = "regular" | "referral" | "profi_ru" | "custom" | "";

export type V2LeadRow = {
  id: string;
  workspace_id: string;
  name: string;
  contact: string;
  comment: string | null;
  lead_type: V2LeadType;
  status: V2LeadStatus;
  reminder_at: string | null;
  estimated_amount: number | null;
  source: V2LeadSource;
  source_custom: string | null;
  taken_into_work_at: string | null;
  sort_order: number;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export const V2_LEAD_STATUSES: {
  key: V2LeadStatus;
  label: string;
  dot: string;
}[] = [
  { key: "correspondence", label: "Переписка", dot: "#3B6FF7" },
  { key: "thinking", label: "Думает", dot: "#F59E0B" },
  { key: "taken_into_work", label: "Взято в работу", dot: "#059669" },
  { key: "awaiting_start", label: "Ожидает начала работы", dot: "#10B981" },
  { key: "pause", label: "Пауза", dot: "#7C3AED" },
  { key: "lost", label: "Слив", dot: "#A1A1AA" },
];

export const V2_LEAD_TYPES: {
  key: V2LeadType;
  label: string;
  soft: string;
  ink: string;
}[] = [
  { key: "agency", label: "Агентство", soft: "#E6EDFF", ink: "#1F3AAF" },
  { key: "course", label: "Курс", soft: "#ECFDF5", ink: "#047857" },
];

export const V2_LEAD_SOURCES: {
  key: Exclude<V2LeadSource, "">;
  label: string;
}[] = [
  { key: "regular", label: "Постоянник" },
  { key: "referral", label: "Рекомендация" },
  { key: "profi_ru", label: "Профи.ru" },
  { key: "custom", label: "Свой" },
];

export function isV2LeadStatus(v: unknown): v is V2LeadStatus {
  return (
    v === "correspondence" ||
    v === "thinking" ||
    v === "taken_into_work" ||
    v === "awaiting_start" ||
    v === "pause" ||
    v === "lost"
  );
}

export function isV2LeadType(v: unknown): v is V2LeadType {
  return v === "agency" || v === "course";
}

export function isV2LeadSource(v: unknown): v is V2LeadSource {
  return v === "" || v === "regular" || v === "referral" || v === "profi_ru" || v === "custom";
}

export function leadSourceLabel(lead: Pick<V2LeadRow, "source" | "source_custom">): string | null {
  if (lead.source === "custom") {
    const custom = lead.source_custom?.trim();
    return custom || "Свой";
  }
  if (!lead.source) return null;
  return V2_LEAD_SOURCES.find((s) => s.key === lead.source)?.label ?? lead.source;
}

export function leadSourceBucketKey(lead: Pick<V2LeadRow, "source" | "source_custom">): string {
  if (lead.source === "custom") {
    const custom = lead.source_custom?.trim();
    return custom ? `custom:${custom}` : "custom";
  }
  if (!lead.source) return "unknown";
  return lead.source;
}
