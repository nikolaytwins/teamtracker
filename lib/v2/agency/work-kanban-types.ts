/** Канбан работ по проектам «Проекты и финансы». */

export type AgencyWorkStatus =
  | "not_started"
  | "waiting_info"
  | "in_progress"
  | "needs_pm"
  | "on_approval"
  | "completed";

export type AgencyKanbanKind = "finance" | "internal";

export type AgencyKanbanCard = {
  id: string;
  kind: AgencyKanbanKind;
  /** Для finance = id проекта; для internal = null */
  finance_project_id: string | null;
  title: string;
  work_status: AgencyWorkStatus;
  sort_order: number;
  note: string | null;
  /** Только finance */
  total_amount: number | null;
  paid_amount: number | null;
  payment_status: "not_paid" | "prepaid" | "paid" | null;
  business_line: "agency" | "impulse" | "qmagic" | null;
  deadline: string | null;
  updated_at: string;
};

export const AGENCY_WORK_STATUSES: {
  key: AgencyWorkStatus;
  label: string;
  dot: string;
}[] = [
  { key: "not_started", label: "Не начато", dot: "#A1A1AA" },
  { key: "waiting_info", label: "Ждём информацию", dot: "#F59E0B" },
  { key: "in_progress", label: "В работе", dot: "#3B6FF7" },
  { key: "needs_pm", label: "Требует внимания проджекта", dot: "#DC2626" },
  { key: "on_approval", label: "На утверждении", dot: "#7C3AED" },
  { key: "completed", label: "Завершено", dot: "#059669" },
];

export function isAgencyWorkStatus(v: unknown): v is AgencyWorkStatus {
  return AGENCY_WORK_STATUSES.some((s) => s.key === v);
}
