import { schema, t, type SchemaType } from "@colyseus/schema";

// The live roster: who is in the room. Durable progress lives in Mongo (src/db.ts).
// To sync something new about a player, add a field here and accept it in a WorldRoom message.
export const PlayerState = schema(
  {
    username: t.string().default(""), // client-reported Bloxity displayName/username, not validated
    signedIn: t.boolean().default(false), // has a Bloxity id: only signed-in players are saved
    uid: t.string().default(""), // verified Bloxity account id ("" = guest): the client matches chat bubbles to riders by it
    pfp: t.string().default(""), // Bloxity profile picture URL ("" = none)
    // Presence (presence.ts, `pose` / `loadout` / `setAvatar`): what the others draw in the world.
    x: t.float64().default(0), // feet position, world metres
    y: t.float64().default(0),
    z: t.float64().default(0),
    yaw: t.float32().default(0), // heading, rad
    speed: t.float32().default(0), // m/s
    bike: t.string().default(""), // equipped bike id (client config.js BIKES), "" = default
    trail: t.string().default(""), // equipped trail id, "" / "none" = none
    pets: t.string().default(""), // equipped pet ids "pup,fox"
    avatar: t.string().default(""), // Bloxity look JSON { equipped, proportions, skin }, "" = default
  },
  "PlayerState",
);
export type PlayerState = SchemaType<typeof PlayerState>;

export const WorldState = schema(
  {
    players: t.map(PlayerState), // keyed by sessionId
  },
  "WorldState",
);
export type WorldState = SchemaType<typeof WorldState>;
