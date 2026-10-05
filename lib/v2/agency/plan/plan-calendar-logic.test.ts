import assert from "node:assert/strict";
import { test } from "node:test";
import {
  encodeChecklistDrag,
  normalizePlanWorkStatus,
  parseChecklistDrag,
  workStatusWrite,
} from "./plan-calendar-logic";

test("encodes and parses week-hint drag payload", () => {
  assert.equal(encodeChecklistDrag("social"), "checklist:social");
  assert.equal(parseChecklistDrag("checklist:lera"), "lera");
  assert.equal(parseChecklistDrag("strategy"), "strategy");
  assert.equal(parseChecklistDrag("todo-uuid"), null);
  assert.equal(parseChecklistDrag(""), null);
});

test("work status follows completed_at and write patch", () => {
  assert.equal(normalizePlanWorkStatus("todo", "2026-10-05T10:00:00Z"), "done");
  assert.equal(normalizePlanWorkStatus("doing", null), "doing");
  assert.equal(normalizePlanWorkStatus("nope", null), "todo");
  const done = workStatusWrite("done", null);
  assert.equal(done.work_status, "done");
  assert.ok(done.completed_at);
  assert.deepEqual(workStatusWrite("doing", "x"), { work_status: "doing", completed_at: null });
});
