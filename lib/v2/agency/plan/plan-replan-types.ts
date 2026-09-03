import { fmtLong, parseYmd } from "@/lib/v2/agency/plan/plan-utils";

export type ReplanChangeRow = {
  itemId: string;
  title: string;
  projectLabel: string | null;
  fromDate: string | null;
  toDate: string;
  hours: number;
  changeType: "move" | "place";
};

export type ReplanPreviewPayload = {
  previewId: string;
  changes: ReplanChangeRow[];
  keeps: string[];
  warnings: string[];
  nextFreeWindowAfter: string | null;
  balanced: boolean;
};

export function formatChangeLine(ch: ReplanChangeRow): string {
  const proj = ch.projectLabel ? `${ch.projectLabel} · ` : "";
  const hrs = Number.isInteger(ch.hours) ? `${ch.hours} ч` : `${ch.hours.toFixed(1)} ч`;
  if (ch.changeType === "place") {
    return `${proj}${ch.title} — разместить ${hrs} на ${fmtLong(parseYmd(ch.toDate))}`;
  }
  const from = ch.fromDate ? fmtLong(parseYmd(ch.fromDate)) : "бэклог";
  return `${proj}${ch.title} — перенести ${hrs} с ${from} на ${fmtLong(parseYmd(ch.toDate))}`;
}
