import assert from "node:assert/strict";
import { test } from "node:test";
import type { HomeMonth } from "../personal/seeds/home-seed";
import { encodeSeasonTaskDrag, parseSeasonTaskDrag, placeSeasonTask } from "./home-season-storage";

const seed: HomeMonth[] = [
  {
    id: "sep",
    label: "Сентябрь",
    tag: "сейчас",
    state: "сейчас",
    headline: "H",
    lead: "",
    tasks: [
      { id: "t-high-1", text: "H1", priority: "high" },
      { id: "t-high-2", text: "H2", priority: "high" },
      { id: "t-med-1", text: "M1", priority: "medium" },
      { id: "t-none", text: "N" },
    ],
  },
];

test("encodes and parses season-card drag payload", () => {
  assert.equal(encodeSeasonTaskDrag("oct-youtube"), "season:oct-youtube");
  assert.equal(parseSeasonTaskDrag("season:nov-review"), "nov-review");
  assert.equal(parseSeasonTaskDrag("todo-uuid"), null);
  assert.equal(parseSeasonTaskDrag(""), null);
});

test("placeSeasonTask inserts a card before another in the same priority", () => {
  const next = placeSeasonTask("t-high-2", "sep", "high", "t-high-1", seed);
  assert.deepEqual(next.taskOrder.sep, ["t-high-2", "t-high-1", "t-med-1", "t-none"]);
});

test("placeSeasonTask moves a card into another priority before a target", () => {
  const next = placeSeasonTask("t-none", "sep", "high", "t-high-1", seed);
  assert.equal(next.taskEdits["t-none"]?.priority, "high");
  assert.deepEqual(next.taskOrder.sep, ["t-none", "t-high-1", "t-high-2", "t-med-1"]);
});

test("placeSeasonTask appends when beforeId is missing", () => {
  const next = placeSeasonTask("t-none", "sep", "low", null, seed);
  assert.equal(next.taskEdits["t-none"]?.priority, "low");
  assert.deepEqual(next.taskOrder.sep, ["t-high-1", "t-high-2", "t-med-1", "t-none"]);
});

test("placeSeasonTask can clear priority", () => {
  const next = placeSeasonTask("t-high-1", "sep", undefined, null, seed);
  assert.equal(next.taskEdits["t-high-1"]?.priority, null);
  assert.deepEqual(next.taskOrder.sep, ["t-high-2", "t-med-1", "t-none", "t-high-1"]);
});
