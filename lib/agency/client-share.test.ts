import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPublicClientEstimate, publicLineFromDetail } from "./client-share";

test("hides hours and rate on hourly lines", () => {
  const line = publicLineFromDetail(
    {
      title: "Правки сайта",
      billingType: "hourly",
      trackedSeconds: 3 * 3600,
      quantity: 1,
      unitPrice: 0,
    },
    4000
  );
  assert.equal(line.package, true);
  assert.equal(line.quantity, 1);
  assert.equal(line.sum, 12000);
  assert.match(JSON.stringify(line), /^((?!час|hour|4000|10800).)*$/i);
});

test("keeps fixed qty and price", () => {
  const line = publicLineFromDetail(
    {
      title: "Обложки",
      billingType: "fixed",
      quantity: 3,
      unitPrice: 2500,
    },
    4000
  );
  assert.deepEqual(line, {
    title: "Обложки",
    quantity: 3,
    unitPrice: 2500,
    sum: 7500,
    package: false,
  });
});

test("manual override beats hourly and fixed formulas", () => {
  const hourly = publicLineFromDetail(
    {
      title: "Правки",
      billingType: "hourly",
      trackedSeconds: 3 * 3600,
      totalOverrideRub: 999,
    },
    4000
  );
  assert.equal(hourly.sum, 999);
  assert.equal(hourly.unitPrice, 999);

  const fixed = publicLineFromDetail(
    {
      title: "Обложки",
      billingType: "fixed",
      quantity: 3,
      unitPrice: 2500,
      totalOverrideRub: 8000,
    },
    4000
  );
  assert.equal(fixed.sum, 8000);
  assert.equal(fixed.quantity, 3);
  assert.equal(fixed.unitPrice, 2500);
});

test("builds months without leaking internal fields", () => {
  const data = buildPublicClientEstimate(
    [
      {
        id: "p1",
        name: "Вера Атара",
        paidAmount: 0,
        status: "not_paid",
        createdAt: "2026-09-15T12:00:00.000Z",
        hourlyRateRub: 4000,
      },
    ],
    {
      p1: [
        { title: "По времени", billingType: "hourly", trackedSeconds: 3600, order: 0 },
        { title: "Фикс", billingType: "fixed", quantity: 2, unitPrice: 1000, order: 1 },
      ],
    }
  );
  assert.equal(data?.name, "Вера Атара");
  assert.equal(data?.months[0]?.total, 6000);
  const raw = JSON.stringify(data);
  assert.equal(raw.includes("hourlyRate"), false);
  assert.equal(raw.includes("trackedSeconds"), false);
  assert.equal(raw.includes("timerStartedAt"), false);
});
