import { GAME_SLUG } from "./constants.js";
import type { PlayerDoc } from "./db.js";

// Bloxity hosted leaderboards (Boxity draws the trophy button and panel itself). Scores come from
// server-owned state -- the saves this server has already bounded -- and are batched to
// POST {BLOXITY_API_URL}/v1/leaderboards/hosted/{BLOXITY_GAME_ID}/report with the injected
// BLOXITY_REPORT_TOKEN (at most 200 scores per call, every 10-30 s). The first declaration of a
// board creates it; these must match the client's leaderboard.define() in src/bloxity.js.
// A no-op when those env vars are unset (local dev).

export const BLOXITY_BOARDS = [
  { id: "wins", label: "Wins", order: "desc", mode: "best", format: "compact", field: "wins" },
  { id: "speed", label: "Speed", order: "desc", mode: "best", format: "compact", field: "speed" },
  { id: "rebirths", label: "Rebirths", order: "desc", mode: "best", format: "number", field: "rebirths" },
  { id: "played", label: "Time Played", order: "desc", mode: "best", format: "time", field: "played" },
] as const;

const FLUSH_MS = 15_000;
const BATCH = 200;

// "board|userId" -> the latest score not yet sent.
const pending = new Map<string, { board: string; userId: string; score: number }>();
const lastSent = new Map<string, number>();
let timer: NodeJS.Timeout | null = null;

// Only the Bloxity account itself ranks: drop a `#m...` suffix (a multi-profile marker).
const accountOf = (userId: string) => userId.split("#")[0];

export const reportingEnabled = () => !!(process.env.BLOXITY_API_URL && process.env.BLOXITY_GAME_ID && process.env.BLOXITY_REPORT_TOKEN);

// Queues the board scores a save carries. Guests (no userId) never rank.
export function queueScores(userId: string, doc: Partial<PlayerDoc>): void {
  if (!userId || !reportingEnabled()) return;
  const account = accountOf(userId);
  for (const b of BLOXITY_BOARDS) {
    const v = doc[b.field];
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) continue;
    const key = `${b.id}|${account}`;
    if (lastSent.get(key) === v) continue;
    pending.set(key, { board: b.id, userId: account, score: v });
  }
  if (!timer) {
    timer = setInterval(() => void flushScores(), FLUSH_MS);
    timer.unref();
  }
}

export async function flushScores(): Promise<void> {
  if (!pending.size || !reportingEnabled()) return;
  const batch = [...pending.entries()].slice(0, BATCH);
  for (const [key] of batch) pending.delete(key);
  try {
    const url = `${process.env.BLOXITY_API_URL!.replace(/\/$/, "")}/v1/leaderboards/hosted/${encodeURIComponent(process.env.BLOXITY_GAME_ID || GAME_SLUG)}/report`;
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.BLOXITY_REPORT_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({
        scores: batch.map(([, s]) => ({ board: s.board, userId: s.userId, score: s.score })),
        boards: BLOXITY_BOARDS.map(({ id, label, order, mode, format }) => ({ id, label, order, mode, format })),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    for (const [key, s] of batch) lastSent.set(key, s.score);
  } catch (err) {
    console.warn("[bloxityBoards] report failed, will retry", err);
    for (const [key, s] of batch) if (!pending.has(key)) pending.set(key, s); // keep the newest
  }
}
