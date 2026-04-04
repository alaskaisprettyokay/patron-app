import { randomBytes } from "crypto";

// Pending OAuth verification states (maps state token → mbid + soundcloud URL)
// Production: use Redis or a database with TTL
const pendingVerifications = new Map<
  string,
  { mbid: string; soundcloudUrl: string; createdAt: number }
>();

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function createVerificationState(
  mbid: string,
  soundcloudUrl: string
): string {
  // Clean expired entries
  const now = Date.now();
  for (const [key, val] of pendingVerifications) {
    if (now - val.createdAt > STATE_TTL_MS) {
      pendingVerifications.delete(key);
    }
  }

  const state = randomBytes(32).toString("hex");
  pendingVerifications.set(state, { mbid, soundcloudUrl, createdAt: now });
  return state;
}

export function consumeVerificationState(
  state: string
): { mbid: string; soundcloudUrl: string } | null {
  const entry = pendingVerifications.get(state);
  if (!entry) return null;

  pendingVerifications.delete(state);

  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null;

  return { mbid: entry.mbid, soundcloudUrl: entry.soundcloudUrl };
}
