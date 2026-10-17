import assert from "node:assert/strict";
import { test } from "node:test";
import { applyStageChange, type HypothesisStage } from "./hypotheses-meta";

function card(id: string, stage: HypothesisStage, sprint_id: string | null = null) {
  return { id, stage, sprint_id };
}

test("blocks a seventh active hypothesis in the same sprint", () => {
  const items = [
    card("a", "active", "s1"),
    card("b", "active", "s1"),
    card("c", "active", "s1"),
    card("e", "active", "s1"),
    card("f", "active", "s1"),
    card("g", "active", "s1"),
    card("d", "queue"),
  ];
  const result = applyStageChange(items, "d", "active", "s1");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /6/);
});

test("keeps an already active card inside the limit", () => {
  const items = [card("a", "active", "s1"), card("b", "active", "s1"), card("c", "active", "s1")];
  const result = applyStageChange(items, "a", "active", "s1");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.item.sprint_id, "s1");
});

test("clears the sprint when a card leaves the board", () => {
  const result = applyStageChange([card("a", "active", "s1")], "a", "queue", "s1");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.item.stage, "queue");
    assert.equal(result.item.sprint_id, null);
  }
});

test("done keeps the sprint the card was checked in", () => {
  const result = applyStageChange([card("a", "active", "s0")], "a", "done", "s1");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.item.sprint_id, "s0");
});
