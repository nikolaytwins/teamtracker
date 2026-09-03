import { fetchJson } from "@/lib/v2/client/fetch-json";
import type { ReplanChangeRow, ReplanPreviewPayload } from "@/lib/v2/agency/plan/plan-replan-types";
import type {
  SofiaContextPanel,
  SofiaMessage,
  SofiaChatTurn,
  SofiaChatResponse,
} from "@/lib/v2/agency/sofia/sofia-types";

export async function fetchSofiaContext(year: number, month: number) {
  const q = new URLSearchParams({ year: String(year), month: String(month) });
  return fetchJson<{ context: SofiaContextPanel; staleChecks: SofiaMessage[] }>(
    `/api/v2/agency/sofia/chat?${q}`
  );
}

export async function sendSofiaMessage(input: {
  message: string;
  history: SofiaChatTurn[];
  year: number;
  month: number;
}) {
  return fetchJson<SofiaChatResponse>("/api/v2/agency/sofia/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function fetchReplanPreview(year: number, month: number) {
  const q = new URLSearchParams({ year: String(year), month: String(month) });
  return fetchJson<{ preview: ReplanPreviewPayload }>(`/api/v2/agency/sofia/replan?${q}`, {
    method: "POST",
  });
}

export async function applyReplan(changes: ReplanChangeRow[]) {
  return fetchJson<{ applied: number; skipped: string[] }>("/api/v2/agency/sofia/replan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes }),
  });
}
