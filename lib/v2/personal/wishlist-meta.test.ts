import assert from "node:assert/strict";
import { test } from "node:test";
import { wishPlacesLeft, wishSeatLimit, wishTier, shortRub } from "./wishlist-meta";

test("puts a price into the first tier that can hold it", () => {
  assert.equal(wishTier(0).id, "t1");
  assert.equal(wishTier(100_000).id, "t1");
  assert.equal(wishTier(100_001).id, "t2");
  assert.equal(wishTier(2_800_000).id, "t5");
  assert.equal(wishTier(45_000_000).id, "t6");
  assert.equal(wishTier(80_000_000).id, "t6");
});

test("counts every seat across tiers", () => {
  assert.equal(wishSeatLimit(), 118);
});

test("declines leftover seats", () => {
  assert.equal(wishPlacesLeft(1), "место");
  assert.equal(wishPlacesLeft(3), "места");
  assert.equal(wishPlacesLeft(11), "мест");
  assert.equal(wishPlacesLeft(22), "места");
});

test("shortens tier sums", () => {
  assert.equal(shortRub(900_000), "900 тр");
  assert.equal(shortRub(2_800_000), "2,8 млн");
});
