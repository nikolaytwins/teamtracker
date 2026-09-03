import { describe, expect, it } from "vitest";
import { DEFAULT_DISPATCH_RULES, normalizeDispatchRules } from "@/lib/v2/agency/dispatch/dispatch-rules-defaults";
import { splitDispatchProjectsForPlan } from "@/lib/v2/agency/dispatch/dispatch-repo";
import type { DispatchProjectView } from "@/lib/v2/agency/dispatch/dispatch-types";

function project(partial: Partial<DispatchProjectView>): DispatchProjectView {
  return {
    id: "p1",
    name: "Test",
    businessLine: "agency",
    paymentStatus: "not_paid",
    dispatchWorkStatus: "planned",
    workModelType: "site",
    workDeadline: null,
    financeDeadline: null,
    plannedHoursRemaining: 10,
    paymentCertainThisMonth: false,
    totalAmount: 100_000,
    paidAmount: 0,
    effectiveTotalAmount: 100_000,
    totalExpenses: 20_000,
    ownerNetTotal: 80_000,
    unpaidOwnerNet: 80_000,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...partial,
  };
}

describe("normalizeDispatchRules", () => {
  it("returns defaults for invalid input", () => {
    expect(normalizeDispatchRules(null)).toEqual(DEFAULT_DISPATCH_RULES);
    expect(normalizeDispatchRules("x")).toEqual(DEFAULT_DISPATCH_RULES);
  });

  it("merges partial overrides", () => {
    const out = normalizeDispatchRules({
      capacity: { plannedHoursPerDay: 5 },
    });
    expect(out.capacity.plannedHoursPerDay).toBe(5);
    expect(out.capacity.reserveShare).toBe(DEFAULT_DISPATCH_RULES.capacity.reserveShare);
  });
});

describe("splitDispatchProjectsForPlan", () => {
  it("counts hours only for consuming statuses", () => {
    const { activeProjects, approvalRiskProjects, totalPlannedHoursRemaining } =
      splitDispatchProjectsForPlan(
        [
          project({ id: "a", dispatchWorkStatus: "in_progress", plannedHoursRemaining: 8 }),
          project({ id: "b", dispatchWorkStatus: "on_approval", plannedHoursRemaining: 20 }),
          project({ id: "c", dispatchWorkStatus: "done", plannedHoursRemaining: 5 }),
        ],
        2026,
        9
      );

    expect(activeProjects.map((p) => p.id)).toEqual(["a"]);
    expect(approvalRiskProjects.map((p) => p.id)).toEqual(["b"]);
    expect(totalPlannedHoursRemaining).toBe(8);
  });
});
