import type { ReplanPreviewPayload } from "@/lib/v2/agency/plan/plan-replan-types";

export type SofiaAction =
  | { type: "copy_client"; text: string; label?: string }
  | { type: "prefill"; text: string; label?: string }
  | { type: "link"; href: string; label: string }
  | { type: "confirm_plan"; previewId: string; label?: string };

export type SofiaUserMessage = { id: string; role: "user"; text: string };

export type SofiaBubbleMessage = {
  id: string;
  role: "sofia";
  kind: "bubble";
  text: string;
  chips?: string[];
  actions?: SofiaAction[];
};

export type SofiaClarifyMessage = {
  id: string;
  role: "sofia";
  kind: "clarify";
  text: string;
  chips: string[];
};

export type SofiaDecisionMessage = {
  id: string;
  role: "sofia";
  kind: "decision";
  headline?: string;
  decision: string;
  alternative?: string;
  why: { text: string; warn?: boolean }[];
  planChanges?: { label: string; value: string; accent?: boolean }[];
  clientMessage?: string;
  actions?: SofiaAction[];
};

export type SofiaStaleCheckMessage = {
  id: string;
  role: "sofia";
  kind: "stale_check";
  text: string;
  projectId?: string;
  chips: string[];
};

export type SofiaMessage =
  | SofiaUserMessage
  | SofiaBubbleMessage
  | SofiaClarifyMessage
  | SofiaDecisionMessage
  | SofiaStaleCheckMessage;

export type SofiaContextPanel = {
  year: number;
  month: number;
  monthLabel: string;
  workScheduledUntil: string | null;
  nextFreeWindow: string | null;
  deadlinesOk: boolean;
  deadlinesNote: string;
  reliableProfitRub: number;
  plannedProfitRub: number;
  protectedDays: { label: string; date: string; mode: "strategy" | "creative" }[];
  rulesUsed: string[];
  /** false when календарь плана недоступен (миграция / схема); остальной контекст из агентства всё равно загружен */
  planCalendarReady: boolean;
};

export type SofiaChatTurn = { role: "user" | "assistant"; text: string };

export type SofiaChatRequest = {
  message: string;
  history?: SofiaChatTurn[];
  year?: number;
  month?: number;
};

export type SofiaChatResponse = {
  messages: SofiaMessage[];
  replanPreview?: ReplanPreviewPayload;
};
