import assert from "node:assert/strict";
import { test } from "node:test";
import { agencyDetailLineTotal } from "./detail-line-total";

test("hourly total without a manual edit is hours times rate", () => {
  assert.equal(
    agencyDetailLineTotal({ billingType: "hourly", trackedSeconds: 90 * 60 }, 2000),
    3000
  );
});

test("manual hourly total stays until newer time is tracked", () => {
  assert.equal(
    agencyDetailLineTotal(
      { billingType: "hourly", trackedSeconds: 3 * 3600, totalOverrideRub: 999 },
      4000
    ),
    999
  );
});

test("timer after a manual total adds only the new time", () => {
  assert.equal(
    agencyDetailLineTotal(
      {
        billingType: "hourly",
        trackedSeconds: 2 * 3600,
        totalOverrideRub: 5000,
        totalOverrideSeconds: 3600,
      },
      3000
    ),
    8000
  );
});
