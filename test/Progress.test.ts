import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { __setPlayersForTest } from "../src/db.js";
import { fakePlayers, sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

describe("progress", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());
  afterEach(() => __setPlayersForTest(null));

  it("sends a saved player their progress and saves what they send back", async () => {
    const fake = fakePlayers([{ _id: "u1", wins: 5000, ownedBikes: ["zippy", "thunder"], bike: "thunder", version: 1, updatedAt: new Date() }]);
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { token: "tok-u1", username: "Ann" });
    let got: any = null;
    c.onMessage("progress", (m: any) => (got = m));
    fake.release();
    await sleep(150);
    assert.strictEqual(got?.wins, 5000);
    assert.deepStrictEqual(got?.ownedBikes, ["zippy", "thunder"]);
    assert.strictEqual(got?.bike, "thunder");

    c.send("saveProgress", { wins: 7000, gems: 3, trail: "sky", pets: [{ uid: 1, id: "pup" }], equippedPets: [1, 9], hack: 1 });
    await sleep(150);
    const doc = fake.docs.get("u1")! as any;
    assert.strictEqual(doc.wins, 7000);
    assert.strictEqual(doc.gems, 3);
    assert.strictEqual(doc.trail, "sky");
    assert.deepStrictEqual(doc.equippedPets, [1], "only owned pets are equipped");
    assert.strictEqual(doc.username, "Ann");
    assert.ok(!("hack" in doc));
  });

  it("remembers that the player has seen the intro", async () => {
    const fake = fakePlayers();
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { token: "tok-intro1" });
    c.onMessage("noProgress", () => {});
    fake.release();
    await sleep(150);
    c.send("saveProgress", { introSeen: true, played: 3 });
    await sleep(150);
    assert.strictEqual((fake.docs.get("intro1") as any)?.introSeen, true);
    await c.leave();
    await sleep(100);

    const reload = fakePlayers([...fake.docs.values()]); // what Mongo now holds; gated again
    __setPlayersForTest(reload);
    const room2 = await colyseus.createRoom<WorldState>("world", {});
    const again = await colyseus.connectTo(room2, { token: "tok-intro1" });
    let got: any = null;
    again.onMessage("progress", (m: any) => (got = m));
    reload.release();
    await sleep(150);
    assert.strictEqual(got?.introSeen, true, "a returning player is told not to replay it");
  });

  it("creates a new account's save and never saves a guest", async () => {
    const fake = fakePlayers();
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { token: "tok-new1" });
    let none = false;
    c.onMessage("noProgress", () => (none = true));
    fake.release();
    await sleep(150);
    assert.ok(none);
    c.send("saveProgress", { wins: 10 });
    await sleep(150);
    assert.strictEqual(fake.docs.get("new1")?.wins, 10);

    const guest = await colyseus.connectTo(room, { userId: "guest-abc" });
    guest.onMessage("noProgress", () => {});
    await sleep(150);
    guest.send("saveProgress", { wins: 99 });
    await sleep(150);
    assert.strictEqual(fake.docs.size, 1, "a guest is never written");
    assert.strictEqual(room.state.players.get(guest.sessionId)?.signedIn, false);
  });

  it("loads the new identity when a guest signs in mid-session", async () => {
    const fake = fakePlayers([{ _id: "u2", wins: 42, version: 1, updatedAt: new Date() }]);
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { userId: "guest-x" });
    let got: any = null;
    c.onMessage("noProgress", () => {});
    c.onMessage("progress", (m: any) => (got = m));
    fake.release();
    await sleep(150);
    c.send("identify", { token: "tok-u2", username: "Bea" });
    await sleep(150);
    assert.strictEqual(got?.wins, 42);
    assert.strictEqual(room.state.players.get(c.sessionId)?.signedIn, true);
  });

  it("keeps saving off when the save could not be read", async () => {
    const fake = fakePlayers([{ _id: "u3", wins: 1e9, version: 1, updatedAt: new Date() }]);
    (fake as any).findOne = async () => {
      await fake.gate;
      throw new Error("down");
    };
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const c = await colyseus.connectTo(room, { token: "tok-u3" });
    let failed = false;
    c.onMessage("serverError", () => (failed = true));
    fake.release();
    await sleep(150);
    assert.ok(failed);
    c.send("saveProgress", { wins: 0 });
    await sleep(150);
    assert.strictEqual(fake.docs.get("u3")!.wins, 1e9, "the unread save is never overwritten");
  });
});

describe("identity", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());
  afterEach(() => __setPlayersForTest(null));

  it("never trusts a client-sent user id, only a verified token", async () => {
    const fake = fakePlayers([{ _id: "victim", wins: 123, version: 1, updatedAt: new Date() }]);
    __setPlayersForTest(fake);
    const room = await colyseus.createRoom<WorldState>("world", {});
    const forged = await colyseus.connectTo(room, { userId: "victim", token: "forged" });
    let got: any = null;
    forged.onMessage("progress", (m: any) => (got = m));
    forged.onMessage("noProgress", () => {});
    fake.release();
    await sleep(150);
    assert.strictEqual(got, null, "a forged id loads nothing");
    forged.send("saveProgress", { wins: 1 });
    await sleep(100);
    assert.strictEqual(fake.docs.get("victim")!.wins, 123, "and writes nothing");
    assert.strictEqual(room.state.players.get(forged.sessionId)?.signedIn, false);

    const real = await colyseus.connectTo(room, { token: "tok-victim" });
    real.onMessage("progress", () => {});
    await sleep(150);
    const p = room.state.players.get(real.sessionId)!;
    assert.strictEqual(p.signedIn, true);
    assert.strictEqual(p.uid, "victim");
  });
});
