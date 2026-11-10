import assert from "assert";

import { CURRENCY_MAX } from "../src/constants.js";
import { sanitizeProgress } from "../src/sanitize.js";

describe("sanitizeProgress", () => {
  it("rejects non-objects and bounds numbers", () => {
    assert.strictEqual(sanitizeProgress(null), null);
    assert.strictEqual(sanitizeProgress([1]), null);
    const out = sanitizeProgress({ wins: 1e40, gems: -5, speed: NaN, rebirths: 3.7, level: 0, hack: "x" })!;
    assert.strictEqual(out.wins, CURRENCY_MAX);
    assert.strictEqual(out.gems, 0);
    assert.strictEqual(out.speed, undefined);
    assert.strictEqual(out.rebirths, 3);
    assert.strictEqual(out.level, 1);
    assert.ok(!("hack" in out));
  });

  it("keeps well-formed bike ids and only equips an owned one", () => {
    const out = sanitizeProgress({ ownedBikes: ["zippy", "thunder", "thunder", "Bad Id!", 7], bike: "thunder", trail: "sky" })!;
    assert.deepStrictEqual(out.ownedBikes, ["zippy", "thunder"]);
    assert.strictEqual(out.bike, "thunder");
    assert.strictEqual(out.trail, "sky");
    assert.strictEqual(sanitizeProgress({ ownedBikes: ["zippy"], bike: "volt" })!.bike, undefined);
  });

  it("keeps well-formed pets and equips only owned uids", () => {
    const out = sanitizeProgress({
      pets: [{ uid: 1, id: "pup" }, { uid: 1, id: "fox" }, { uid: 2, id: "Bad Id!" }, { uid: 3.5, id: "cat" }, { uid: 4, id: "fox" }, "x"],
      equippedPets: [1, 4, 4, 9],
    })!;
    assert.deepStrictEqual(out.pets, [{ uid: 1, id: "pup" }, { uid: 4, id: "fox" }]);
    assert.deepStrictEqual(out.equippedPets, [1, 4]);
  });

  it("keeps the intro flag only as a boolean", () => {
    assert.strictEqual(sanitizeProgress({ introSeen: true })!.introSeen, true);
    assert.strictEqual(sanitizeProgress({ introSeen: false })!.introSeen, false);
    assert.ok(!("introSeen" in sanitizeProgress({ introSeen: "yes" })!));
  });

  it("keeps the worlds: w1 always unlocked, the current one only if unlocked, bounded chest times", () => {
    const out = sanitizeProgress({ worlds: ["w2", "w2", "Bad Id!", 3], world: "w2", worldChests: { w2: 1700000000, w3: "x", "Bad Id!": 5, w4: 1e20 } })!;
    assert.deepStrictEqual(out.worlds, ["w1", "w2"]);
    assert.strictEqual(out.world, "w2");
    assert.deepStrictEqual(out.worldChests, { w2: 1700000000, w4: 1e13 });
    assert.strictEqual(sanitizeProgress({ worlds: ["w1"], world: "w3" })!.world, undefined);
    assert.strictEqual(sanitizeProgress({ world: "w3" })!.world, "w3");
    assert.ok(!("worldChests" in sanitizeProgress({ worldChests: [1] })!));
  });

  it("bounds boosts and the daily streak", () => {
    const out = sanitizeProgress({ boosts: { speed: 1e12, wins: -4 }, daily: { streak: 2.9, last: "x" }, customSpeed: 99999 })!;
    assert.deepStrictEqual(out.boosts, { speed: 1e12, wins: 0 });
    assert.deepStrictEqual(out.daily, { streak: 2, last: 0 });
    assert.strictEqual(out.customSpeed, 1000);
  });
});
