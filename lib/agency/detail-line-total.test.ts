import assert from "node:assert/strict";
import { test } from "node:test";
import { mapDetailRow } from "../agency-store/map-pg";
import { agencyDetailLineTotal, agencyDetailManualTotalRub } from "./detail-line-total";

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

test("hourly manual total can live in unit price when the rub column is missing", () => {
  assert.equal(
    agencyDetailManualTotalRub({
      billingType: "hourly",
      unitPrice: 12000,
      totalOverrideRub: null,
      totalOverrideSeconds: 3600,
    }),
    12000
  );
  assert.equal(
    agencyDetailManualTotalRub({
      billingType: "hourly",
      unitPrice: 12000,
      totalOverrideRub: null,
      totalOverrideSeconds: null,
    }),
    null
  );
  assert.equal(
    agencyDetailManualTotalRub({
      billingType: "hourly",
      unitPrice: 1,
      totalOverrideRub: 9000,
      totalOverrideSeconds: 10,
    }),
    9000
  );
});

test("a stored hourly row without the rub column still bills the manual total", () => {
  const row = mapDetailRow({
    billing_type: "hourly",
    unit_price: 7000,
    total_override_seconds: 100,
    tracked_seconds: 4600,
  });
  assert.equal(row.totalOverrideRub, 7000);
  assert.equal(
    agencyDetailLineTotal(
      {
        billingType: String(row.billingType),
        trackedSeconds: Number(row.trackedSeconds),
        totalOverrideRub: row.totalOverrideRub as number,
        totalOverrideSeconds: row.totalOverrideSeconds as number,
      },
      3600
    ),
    11500
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
