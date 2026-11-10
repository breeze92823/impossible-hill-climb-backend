import { GAME_SLUG } from "./constants.js";

// Account identity. A client-sent user id is NEVER trusted (Bloxity audit_sdk blocks that): the
// client sends its Bloxity game token (`Legion.SDK.auth.getToken()`) and this server verifies it
// with the Bloxity API (POST {BLOXITY_API_URL}/v1/auth/game-token/verify, Bearer token,
// { gameSlug }), using only the returned `user._id` as the account id. A token that fails
// verification is a guest: nothing is loaded or saved for it.

export interface Identity {
  id: string; // verified Bloxity user id, "" = guest
  name?: string; // verified display name, when the API returned one
}

export type Verifier = (token: string) => Promise<Identity | null>;

const gameSlug = () => process.env.BLOXITY_GAME_ID || GAME_SLUG;

async function bloxityVerifier(token: string): Promise<Identity | null> {
  const base = process.env.BLOXITY_API_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/auth/game-token/verify`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ gameSlug: gameSlug() }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const user = ((await res.json()) as { user?: { _id?: unknown; displayName?: unknown; username?: unknown } })?.user;
    if (!user || typeof user._id !== "string" || !user._id) return null;
    const name = typeof user.displayName === "string" ? user.displayName : typeof user.username === "string" ? user.username : undefined;
    return { id: user._id, name };
  } catch (err) {
    console.warn("[auth] token verification failed", err);
    return null;
  }
}

let verifier: Verifier = bloxityVerifier;

// Test-only seam: map tokens to identities without the Bloxity API.
export function __setVerifierForTest(v: Verifier | null): void {
  verifier = v ?? bloxityVerifier;
}

// Local development has no Bloxity API: a `dev-` id is accepted, but only outside production and
// only while BLOXITY_API_URL is unset (a deployed server always has it).
const DEV_ID = /^dev-[A-Za-z0-9]{1,24}$/;

export async function resolveIdentity(token: unknown, devId?: unknown): Promise<Identity> {
  if (typeof token === "string" && token) {
    const who = await verifier(token);
    if (who) return who;
  }
  if (process.env.NODE_ENV !== "production" && !process.env.BLOXITY_API_URL && typeof devId === "string" && DEV_ID.test(devId)) {
    return { id: devId };
  }
  return { id: "" };
}
