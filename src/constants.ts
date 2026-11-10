// Keep in step with the client's src/config.js by hand (Impossible Hill Climb).
export const ROOM_MAX_CLIENTS = 50;
// The game id registered on bloxity.io (the client's GAME_SLUG); BLOXITY_GAME_ID overrides it when deployed.
export const GAME_SLUG = "impossible-hill-climb";

// Longest accepted strings.
export const NAME_MAX = 64;
// Profile picture URL (Bloxity `pfp`), relayed so other players can draw it.
export const PFP_MAX_LEN = 512;
// Presence (presence.ts): the Bloxity avatar JSON relayed for the others to draw, the most pets
// drawn per player, and the pose bounds (|x|, |y|, |z| up to `xy` m; speed in m/s).
export const AVATAR_MAX_LEN = 3000;
export const PRESENCE_PETS_MAX = 8;
export const POSE_BOUNDS = { xy: 5000, speed: 2000 };

// Colyseus drops the whole connection for a WebSocket message above this (default 4 KB).
export const MAX_PAYLOAD_BYTES = 128 * 1024;

// How long a dropped connection (WiFi blip, backgrounded tab) may reconnect with the same session.
export const RECONNECT_SECONDS = 20;

// Upper bounds for saved values, so a forged payload cannot store a bogus number. Generous
// ceilings, not game rules.
export const CURRENCY_MAX = 1e33; // wins, gems, speed, xp
export const LEVEL_MAX = 1e6;
export const REBIRTHS_MAX = 1e9;
export const PLAY_SECONDS_MAX = 31_536_000 * 10; // ~10 years
export const CUSTOM_SPEED_MAX = 1000; // client ECONOMY.customSpeedMax is 180
export const BOOST_UNTIL_MAX = 1e13; // unix seconds; the client uses 1e12 for a permanent boost
export const DAILY_STREAK_MAX = 1e6;

// Owned bike ids (client BIKES + FEATURED_BIKES, ~12), with slack.
export const OWNED_MAX = 256;
export const PET_SLOTS_MAX = 8; // = client PET_LIMITS.maxSlots
export const PET_STORAGE_MAX = 500; // = client PET_LIMITS.maxStorage
export const SPINS_MAX = 1e6; // banked spin-wheel spins
export const SPIN_TIMER_MAX = 7 * 24 * 3600; // s until the next free spin (config SPIN.freeEvery is far below)
// Pets (client PETS / EGGS): at most PETS_MAX owned, equipped capped at PET_EQUIP_MAX.
export const PETS_MAX = 1000;
export const PET_EQUIP_MAX = 50;
export const PET_UID_MAX = 1e9;
// Worlds (client WORLDS: w1 lobby, w2 jungle, w3 volcano): unlocked list and per-world chest timers.
export const WORLDS_MAX = 16;

// Leaderboards (leaderboard.ts; client zones.js boards): the saved doc fields ranked, rows per
// board and how often the lists are re-read and re-sent.
export const LEADERBOARD_STATS = ["wins", "speed", "played", "rebirths"] as const;
export type LeaderboardStat = (typeof LEADERBOARD_STATS)[number];
export const LEADERBOARD_SIZE = 10;
export const LEADERBOARD_EVERY_MS = 60 * 1000;

// Ids from the client's catalogs (bikes, pets, trails): slugs, so nothing odd is stored.
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

// The client's per-browser fallback id for players who are not signed in to Bloxity.
// Guests are never persisted.
export const GUEST_ID_PREFIX = "guest-";
