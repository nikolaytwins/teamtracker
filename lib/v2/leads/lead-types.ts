export type V2LeadStatus = "correspondence" | "thinking" | "awaiting_start" | "pause" | "lost";
export type V2LeadType = "agency" | "course";

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

export function isV2LeadStatus(v: unknown): v is V2LeadStatus {
  return v === "correspondence" || v === "thinking" || v === "awaiting_start" || v === "pause" || v === "lost";
}

export function isV2LeadType(v: unknown): v is V2LeadType {
  return v === "agency" || v === "course";
}
