import { MongoClient, type Collection } from "mongodb";

import { LEADERBOARD_STATS } from "./constants.js";

// Bloxity Legion hosting injects MONGODB_URI per game+channel -- an isolated database with
// scoped credentials. A local `npm start` normally has no Mongo reachable, so a missing or
// unreachable URI must degrade to "no persistence" rather than crash the room.

// The persisted client state (what `saveProgress` carries, see sanitize.ts; field names are the
// client's own `state` keys in src/game/state.js). A signed-in player's document wins on load.
export interface PlayerDoc {
  _id: string; // Bloxity user id -- see WorldRoom.ts (guests are never saved)
  username?: string; // display name as of the last save
  speed?: number; // the training stat
  level?: number;
  xp?: number;
  wins?: number;
  gems?: number;
  rebirths?: number;
  bike?: string; // equipped bike id (an owned one)
  ownedBikes?: string[];
  pets?: SavedPet[];
  equippedPets?: number[]; // uids of equipped pets
  nextPetUid?: number;
  trail?: string; // equipped trail id ("none" = no trail)
  boosts?: { speed: number; wins: number }; // unix s each timed boost runs until
  customSpeed?: number;
  lastChest?: number; // unix s
  lastAd?: number; // unix s of the last rewarded-ad bonus
  daily?: { streak: number; last: number };
  spins?: number; // banked spin-wheel spins
  spinTimer?: number; // s of play until the next free spin
  ownedTrails?: string[]; // trails bought or won
  petSlots?: number; // pets equipped at once
  petStorage?: number; // pets owned at most
  played?: number; // s played
  boulderStop?: number; // unix s
  introSeen?: boolean; // watched (or skipped) the new-player intro cutscene
  lastSeen?: number; // epoch ms of the last activity
  version: number;
  updatedAt: Date;
}

// One owned pet: a unique id within the save and its PETS key.
export interface SavedPet {
  uid: number;
  id: string;
}

let client: MongoClient | null = null;
let players: Collection<PlayerDoc> | null = null;

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[db] MONGODB_URI not set -- player progress will not persist");
    return;
  }
  try {
    client = new MongoClient(uri);
    await client.connect();
    // No dbName passed to .db() -- the injected URI already points at this game+channel's database.
    players = client.db().collection<PlayerDoc>("players");
    console.log("[db] connected to MongoDB");
    // The leaderboards sort and count by these (leaderboard.ts).
    for (const stat of LEADERBOARD_STATS) {
      players.createIndex({ [stat]: -1 }).catch((err) => console.warn(`[db] index on ${stat} failed`, err));
    }
  } catch (err) {
    console.warn("[db] connect failed -- player progress will not persist:", err);
    client = null;
    players = null;
  }
}

// Null whenever Mongo is unset/unreachable -- every caller must treat that as "skip persistence".
export function getPlayers(): Collection<PlayerDoc> | null {
  return players;
}

// Test-only seam: exercise the save/load logic against an in-memory fake collection.
export function __setPlayersForTest(fake: Collection<PlayerDoc> | null): void {
  players = fake;
}
