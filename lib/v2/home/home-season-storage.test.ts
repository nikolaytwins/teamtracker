import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeSeasonTaskDrag, parseSeasonTaskDrag } from "./home-season-storage";

test("encodes and parses season-card drag payload", () => {
  assert.equal(encodeSeasonTaskDrag("oct-youtube"), "season:oct-youtube");
  assert.equal(parseSeasonTaskDrag("season:nov-review"), "nov-review");
  assert.equal(parseSeasonTaskDrag("todo-uuid"), null);
  assert.equal(parseSeasonTaskDrag(""), null);
});
