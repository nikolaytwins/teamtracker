import { randomBytes } from "crypto";
import {
  agencyDetailEffectiveSeconds,
  agencyDetailLineTotal,
} from "@/lib/agency/detail-line-total";
import { FINANCE_MONTH_NAMES } from "@/lib/v2/finance/meta";

export const CLIENT_SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{8,64}$/;

export type PublicClientLine = {
  title: string;
  quantity: number;
  unitPrice: number;
  sum: number;
  package: boolean;
};

export type PublicClientMonth = {
  key: string;
  label: string;
  shortLabel: string;
  status: string;
  paidAmount: number;
  total: number;
  lines: PublicClientLine[];
};

export type PublicClientEstimate = {
  name: string;
  months: PublicClientMonth[];
};

export type ClientShareProjectInput = {
  id: string;
  name: string;
  paidAmount: number;
  status: string;
  createdAt: string | null;
  hourlyRateRub?: number;
};

export type ClientShareDetailInput = {
  title: string;
  quantity?: number | null;
  unitPrice?: number | null;
  billingType?: string | null;
  trackedSeconds?: number | null;
  timerStartedAt?: string | null;
  totalOverrideRub?: number | null;
  order?: number | null;
};

export function generateClientShareToken(): string {
  return randomBytes(16).toString("base64url");
}

export function isClientShareToken(raw: string): boolean {
  return CLIENT_SHARE_TOKEN_RE.test(raw.trim());
}

export function projectMonthKey(createdAt: string | null | undefined, fallback = new Date()): string {
  const d = createdAt ? new Date(createdAt) : fallback;
  if (Number.isNaN(d.getTime())) {
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatFinanceMonthLabel(key: string): { label: string; shortLabel: string } {
  const [ys, ms] = key.split("-");
  const year = Number(ys);
  const month = Number(ms);
  const name = FINANCE_MONTH_NAMES[month - 1] ?? key;
  const short = name.slice(0, 3);
  return {
    label: Number.isFinite(year) ? `${name} ${year}` : name,
    shortLabel: Number.isFinite(year) ? `${short} ${year}` : short,
  };
}

export function publicLineFromDetail(
  detail: ClientShareDetailInput,
  hourlyRateRub: number,
  nowMs = Date.now()
): PublicClientLine {
  const isHourly = detail.billingType === "hourly";
  const liveSeconds = isHourly
    ? agencyDetailEffectiveSeconds(
        { trackedSeconds: detail.trackedSeconds, timerStartedAt: detail.timerStartedAt },
        nowMs
      )
    : 0;
  const sum = agencyDetailLineTotal(
    {
      billingType: detail.billingType,
      quantity: detail.quantity,
      unitPrice: detail.unitPrice,
      trackedSeconds: liveSeconds,
      totalOverrideRub: detail.totalOverrideRub,
    },
    hourlyRateRub
  );
  if (isHourly) {
    return {
      title: String(detail.title || "Работа"),
      quantity: 1,
      unitPrice: sum,
      sum,
      package: true,
    };
  }
  const quantity = Number(detail.quantity) || 0;
  const unitPrice = Number(detail.unitPrice) || 0;
  return {
    title: String(detail.title || "Работа"),
    quantity,
    unitPrice,
    sum,
    package: false,
  };
}

export function buildPublicClientEstimate(
  projects: ClientShareProjectInput[],
  detailsByProjectId: Record<string, ClientShareDetailInput[]>,
  nowMs = Date.now()
): PublicClientEstimate | null {
  if (!projects.length) return null;
  const months: PublicClientMonth[] = projects
    .map((project) => {
      const key = projectMonthKey(project.createdAt);
      const labels = formatFinanceMonthLabel(key);
      const rate = Number(project.hourlyRateRub) || 0;
      const details = [...(detailsByProjectId[project.id] ?? [])].sort((a, b) => {
        return (Number(a.order) || 0) - (Number(b.order) || 0);
      });
      const lines = details.map((d) => publicLineFromDetail(d, rate, nowMs));
      const total = lines.reduce((sum, line) => sum + line.sum, 0);
      return {
        key,
        label: labels.label,
        shortLabel: labels.shortLabel,
        status: String(project.status || "not_paid"),
        paidAmount: Number(project.paidAmount) || 0,
        total,
        lines,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  return {
    name: String(projects[projects.length - 1]?.name || projects[0]?.name || "Проект"),
    months,
  };
}
