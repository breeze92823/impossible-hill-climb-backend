import {
  CURRENCY_MAX, LEVEL_MAX, REBIRTHS_MAX, PLAY_SECONDS_MAX, CUSTOM_SPEED_MAX, BOOST_UNTIL_MAX, DAILY_STREAK_MAX,
  OWNED_MAX, PETS_MAX, PET_EQUIP_MAX, PET_UID_MAX, ID_PATTERN, SPINS_MAX, SPIN_TIMER_MAX, PET_SLOTS_MAX, PET_STORAGE_MAX,
} from "./constants.js";
import type { PlayerDoc, SavedPet } from "./db.js";

export function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
export function clampNum(v: number, max: number): number {
  return Math.min(max, Math.max(0, v));
}
export function clampInt(v: number, max: number, min = 0): number {
  return Math.min(max, Math.max(min, Math.floor(v)));
}
function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
const isId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

// Catalog ids (bikes): slug strings, no duplicates, bounded count.
export function sanitizeIds(raw: unknown, max = OWNED_MAX): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isId))].slice(0, max);
}

// Owned pets { uid, id }: unique integer uids, slug ids, at most PETS_MAX.
export function sanitizePets(raw: unknown): SavedPet[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedPet[] = [];
  const seen = new Set<number>();
  for (const p of raw) {
    if (out.length >= PETS_MAX) break;
    if (!isObject(p) || !isId(p.id) || !Number.isInteger(p.uid)) continue;
    const uid = p.uid as number;
    if (uid < 0 || uid > PET_UID_MAX || seen.has(uid)) continue;
    seen.add(uid);
    out.push({ uid, id: p.id });
  }
  return out;
}

// The game is client-authoritative -- no server-side gameplay validation. What IS enforced:
// shape and bounds, so a malformed payload can never corrupt this player's own Mongo document.
// A forged number can only ever affect the sender's own save.
export function sanitizeProgress(raw: unknown): Partial<PlayerDoc> | null {
  if (!isObject(raw)) return null;
  const out: Partial<PlayerDoc> = {};

  if (finite(raw.speed)) out.speed = clampNum(raw.speed, CURRENCY_MAX);
  if (finite(raw.xp)) out.xp = clampNum(raw.xp, CURRENCY_MAX);
  if (finite(raw.wins)) out.wins = clampNum(raw.wins, CURRENCY_MAX);
  if (finite(raw.gems)) out.gems = clampNum(raw.gems, CURRENCY_MAX);
  if (finite(raw.level)) out.level = clampInt(raw.level, LEVEL_MAX, 1);
  if (finite(raw.rebirths)) out.rebirths = clampInt(raw.rebirths, REBIRTHS_MAX);
  if (finite(raw.played)) out.played = clampNum(raw.played, PLAY_SECONDS_MAX);
  if (finite(raw.customSpeed)) out.customSpeed = clampInt(raw.customSpeed, CUSTOM_SPEED_MAX, 1);
  if (finite(raw.lastChest)) out.lastChest = clampNum(raw.lastChest, BOOST_UNTIL_MAX);
  if (finite(raw.lastAd)) out.lastAd = clampNum(raw.lastAd, BOOST_UNTIL_MAX);
  if (finite(raw.petSlots)) out.petSlots = clampInt(raw.petSlots, PET_SLOTS_MAX, 1);
  if (finite(raw.petStorage)) out.petStorage = clampInt(raw.petStorage, PET_STORAGE_MAX, 1);
  if (finite(raw.spins)) out.spins = clampInt(raw.spins, SPINS_MAX);
  if (finite(raw.spinTimer)) out.spinTimer = clampNum(raw.spinTimer, SPIN_TIMER_MAX);
  if (finite(raw.boulderStop)) out.boulderStop = clampNum(raw.boulderStop, BOOST_UNTIL_MAX);
  if (finite(raw.lastSeen)) out.lastSeen = clampInt(raw.lastSeen, Date.now() + 10 * 60 * 1000);
  if (typeof raw.introSeen === "boolean") out.introSeen = raw.introSeen;
  if (finite(raw.nextPetUid)) out.nextPetUid = clampInt(raw.nextPetUid, PET_UID_MAX + 1, 1);

  if (isObject(raw.boosts)) {
    const b = raw.boosts;
    out.boosts = {
      speed: finite(b.speed) ? clampNum(b.speed, BOOST_UNTIL_MAX) : 0,
      wins: finite(b.wins) ? clampNum(b.wins, BOOST_UNTIL_MAX) : 0,
    };
  }
  if (isObject(raw.daily)) {
    const d = raw.daily;
    out.daily = {
      streak: finite(d.streak) ? clampInt(d.streak, DAILY_STREAK_MAX) : 0,
      last: finite(d.last) ? clampNum(d.last, BOOST_UNTIL_MAX) : 0,
    };
  }

  if (raw.ownedBikes !== undefined) out.ownedBikes = sanitizeIds(raw.ownedBikes);
  // The equipped bike must be owned when this save carries the list; otherwise trust the shape only.
  if (isId(raw.bike) && (!out.ownedBikes || out.ownedBikes.includes(raw.bike))) out.bike = raw.bike;
  if (isId(raw.trail)) out.trail = raw.trail;
  if (raw.ownedTrails !== undefined) out.ownedTrails = sanitizeIds(raw.ownedTrails);

  if (raw.pets !== undefined) out.pets = sanitizePets(raw.pets);
  if (raw.equippedPets !== undefined) {
    const uids = Array.isArray(raw.equippedPets)
      ? raw.equippedPets.filter((u): u is number => Number.isInteger(u) && u >= 0 && u <= PET_UID_MAX)
      : [];
    const owned = out.pets ? new Set(out.pets.map((p) => p.uid)) : null;
    out.equippedPets = [...new Set(uids)].filter((u) => !owned || owned.has(u)).slice(0, PET_EQUIP_MAX);
  }
  return out;
}
