import { AVATAR_MAX_LEN, ID_PATTERN, POSE_BOUNDS, PRESENCE_PETS_MAX } from "./constants.js";
import type { PlayerState } from "./rooms/schema/WorldState.js";

// Presence: what the other clients need to draw a player in the world. Relayed through the roster
// as sent, only bounded here -- like the rest of the game it is client-authoritative and purely
// cosmetic.

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const isId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

// `pose` { x, y, z, yaw, speed }: the rider's feet position (world metres), heading (rad) and speed (m/s).
export function applyPose(p: PlayerState, msg: unknown): void {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  const b = POSE_BOUNDS;
  if (finite(m.x)) p.x = clamp(m.x, -b.xy, b.xy);
  if (finite(m.y)) p.y = clamp(m.y, -b.xy, b.xy);
  if (finite(m.z)) p.z = clamp(m.z, -b.xy, b.xy);
  if (finite(m.yaw)) p.yaw = Math.atan2(Math.sin(m.yaw), Math.cos(m.yaw));
  if (finite(m.speed)) p.speed = clamp(m.speed, 0, b.speed);
}

// `loadout` { bike, trail, pets: [petId, ...] }: equipped catalog ids ("" = none). Pets travel as
// ids joined by commas, capped at PRESENCE_PETS_MAX.
export function applyLoadout(p: PlayerState, msg: unknown): void {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  for (const key of ["bike", "trail"] as const) {
    const v = m[key];
    if (v === "" || isId(v)) p[key] = v as string;
  }
  if (Array.isArray(m.pets)) p.pets = m.pets.filter(isId).slice(0, PRESENCE_PETS_MAX).join(",");
}

// `setAvatar` { avatar }: the Bloxity look as an opaque JSON string ("" = default), length-capped.
export function applyAvatar(p: PlayerState, msg: unknown): void {
  const a = (msg as { avatar?: unknown })?.avatar;
  if (typeof a === "string" && a.length <= AVATAR_MAX_LEN) p.avatar = a;
}
