import { getAgencyRepo } from "@/lib/agency-store";
import { buildCardPhasesPayload } from "@/lib/pm-phases";
import { getProjectTimeDetail, secondsToHours } from "@/lib/time-analytics";

export type CardPhasesPayload = ReturnType<typeof buildCardPhasesPayload>;

export type TimeMatrixRowJson = {
  phaseId: string;
  phaseTitle: string;
  phaseSeconds: number;
  phaseHours: number;
  byWorker: Record<string, { seconds: number; hours: number }>;
};

export type CardEconomicsJson = {
  projectId: string;
  projectName: string;
  paidAmount: number;
  totalAmount: number;
  status: string;
  completedHours: number;
  effectiveHourlyPaidRub: number | null;
};

export type ExtendedCardPhasesPayload = CardPhasesPayload & {
  timeMatrix: TimeMatrixRowJson[];
  workerBreakdown: Record<string, { seconds: number; hours: number }> | null;
  economics: CardEconomicsJson | null;
};

export async function extendCardPhasesPayload(
  cardId: string,
  payload: CardPhasesPayload
): Promise<ExtendedCardPhasesPayload> {
  const detail = getProjectTimeDetail(cardId, {
    activeEntry: payload.activeEntry,
    nowMs: Date.now(),
  });

  const timeMatrix: TimeMatrixRowJson[] =
    detail?.matrix.map((row) => ({
      phaseId: row.phaseId,
      phaseTitle: row.phaseTitle,
      phaseSeconds: row.phaseSeconds,
      phaseHours: secondsToHours(row.phaseSeconds),
      byWorker: Object.fromEntries(
        Object.entries(row.byWorker).map(([w, s]) => [w, { seconds: s, hours: secondsToHours(s) }])
      ),
    })) ?? [];

  const workerBreakdown =
    detail &&
    Object.fromEntries(
      Object.entries(detail.byWorker).map(([w, s]) => [w, { seconds: s, hours: secondsToHours(s) }])
    );

  let economics: CardEconomicsJson | null = null;
  const sourceId = payload.card?.source_project_id?.trim();
  if (sourceId && payload.card) {
    try {
      const ap = await getAgencyRepo().getProjectById(sourceId);
      if (ap && typeof ap === "object") {
        const paidAmount = Number((ap as { paidAmount?: unknown }).paidAmount) || 0;
        const totalAmount = Number((ap as { totalAmount?: unknown }).totalAmount) || 0;
        const status = String((ap as { status?: unknown }).status ?? "");
        const projectName = String((ap as { name?: unknown }).name ?? "");
        const totalSec = payload.projectTotalSeconds;
        const completedHours = secondsToHours(totalSec);
        const effectiveHourlyPaidRub =
          paidAmount > 0 && completedHours > 0 ? Math.round(paidAmount / completedHours) : null;
        economics = {
          projectId: sourceId,
          projectName,
          paidAmount,
          totalAmount,
          status,
          completedHours,
          effectiveHourlyPaidRub,
        };
      }
    } catch {
      economics = null;
    }
  }

  return {
    ...payload,
    timeMatrix,
    workerBreakdown,
    economics,
  };
}
