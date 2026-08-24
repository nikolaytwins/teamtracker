import { describe, expect, it } from "vitest";
import { diaryTagMatchKey, resolveDiaryTagNames } from "./resolve-diary-tags";

const EXISTING = [
  { name: "👨🏻‍💻 работа", count: 6 },
  { name: "🤩 энергия плюс", count: 7 },
  { name: "😵‍💫 энергия минус", count: 7 },
  { name: "🔥 само возвращается", count: 9 },
];

describe("diaryTagMatchKey", () => {
  it("strips emoji and normalizes", () => {
    expect(diaryTagMatchKey("👨🏻‍💻 работа")).toBe("работа");
    expect(diaryTagMatchKey("#работа")).toBe("работа");
  });
});

describe("resolveDiaryTagNames", () => {
  it("maps plain hint to tagged name with emoji", () => {
    const r = resolveDiaryTagNames(["работа"], EXISTING);
    expect(r.resolved).toEqual(["👨🏻‍💻 работа"]);
    expect(r.unmatched).toEqual([]);
  });

  it("maps partial phrase", () => {
    const r = resolveDiaryTagNames(["само возвращается"], EXISTING);
    expect(r.resolved).toEqual(["🔥 само возвращается"]);
  });

  it("flags ambiguous energy tags", () => {
    const r = resolveDiaryTagNames(["энергия"], EXISTING);
    expect(r.resolved).toEqual([]);
    expect(r.ambiguous[0]?.candidates).toHaveLength(2);
  });

  it("returns unmatched when no fit", () => {
    const r = resolveDiaryTagNames(["квантовая физика"], EXISTING);
    expect(r.unmatched).toEqual(["квантовая физика"]);
  });
});
