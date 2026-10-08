import assert from "node:assert/strict";
import { test } from "node:test";
import { applyHypothesisMove, parseQuickHypothesis, type HypothesisPriority } from "./hypotheses-meta";

function card(id: string, priority: HypothesisPriority, sort_order: number) {
  return { id, priority, sort_order };
}

test("quick line splits direction and hypothesis on a dash", () => {
  assert.deepEqual(parseQuickHypothesis("  Qmagic — дизайнеры хотят один код  "), {
    direction: "Qmagic",
    title: "дизайнеры хотят один код",
  });
  assert.deepEqual(parseQuickHypothesis("Просто формулировка без направления"), {
    direction: "",
    title: "Просто формулировка без направления",
  });
  assert.equal(parseQuickHypothesis("   "), null);
  const plain = parseQuickHypothesis("AI-native продукт без разделителя");
  assert.equal(plain?.direction, "");
});

test("reorder inside a priority and across priorities", () => {
  const items = [card("a", "medium", 0), card("b", "medium", 1), card("c", "medium", 2)];
  const swapped = applyHypothesisMove(items, "c", "a");
  assert.deepEqual(
    swapped?.map((item) => item.id),
    ["c", "a", "b"],
  );
  assert.deepEqual(
    applyHypothesisMove(items, "b", "c")?.map((item) => item.id),
    ["a", "c", "b"],
  );
  assert.equal(applyHypothesisMove(items, "b", "b"), null);

  const lifted = applyHypothesisMove(items, "b", "prio:high");
  assert.equal(lifted?.find((item) => item.id === "b")?.priority, "high");
  assert.deepEqual(
    lifted?.filter((item) => item.priority === "medium").map((item) => item.id),
    ["a", "c"],
  );
});
