/**
 * SoundCloud internal API client.
 *
 * WARNING: This uses SoundCloud's undocumented api-v2 endpoints and
 * client_id extraction from their JS bundles. It could break at any
 * time if SoundCloud changes their bundle structure or API.
 */

// --- client_id cache ---

let cachedClientId: string | null = null;
let clientIdExpiresAt = 0;
const CLIENT_ID_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Scrape a client_id from SoundCloud's JS bundles.
 *
 * 1. Fetch soundcloud.com homepage
 * 2. Find all JS bundle URLs (a-v2.sndcdn.com/assets/*.js)
 * 3. Search each bundle for a client_id string
 */
async function extractClientId(): Promise<string> {
  const now = Date.now();
  if (cachedClientId && now < clientIdExpiresAt) {
    return cachedClientId;
  }

  const homepageRes = await fetch("https://soundcloud.com", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OndaVerifier/0.1)" },
  });
  if (!homepageRes.ok) {
    throw new Error(`Failed to fetch SoundCloud homepage: ${homepageRes.status}`);
  }

  const html = await homepageRes.text();

  // Extract JS bundle URLs — SoundCloud loads multiple chunked bundles
  const bundleUrls = [
    ...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^\s"']+\.js/g),
  ].map((m) => m[0]);

  if (bundleUrls.length === 0) {
    throw new Error("No SoundCloud JS bundles found on homepage");
  }

  // Search bundles for client_id (usually in one of the last bundles)
  for (const url of bundleUrls.reverse()) {
    try {
      const res = await fetch(url);
      const js = await res.text();
      const match = js.match(/client_id:"([a-zA-Z0-9]+)"/);
      if (match) {
        cachedClientId = match[1];
        clientIdExpiresAt = now + CLIENT_ID_TTL_MS;
        return cachedClientId;
      }
    } catch {
      // Bundle fetch failed — try next one
      continue;
    }
  }

  throw new Error("Could not extract client_id from any SoundCloud bundle");
}

// --- Token store ---

interface PendingToken {
  token: string;
  username: string;
  createdAt: number;
}

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const pendingTokens = new Map<string, PendingToken>();

/** Evict expired tokens lazily. */
function evictExpired() {
  const now = Date.now();
  for (const [key, entry] of pendingTokens) {
    if (now - entry.createdAt > TOKEN_TTL_MS) {
      pendingTokens.delete(key);
    }
  }
}

/** Generate a random verification token and store it. */
export function generateToken(username: string): string {
  evictExpired();

  const hex = [...crypto.getRandomValues(new Uint8Array(8))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const token = `verify-${hex}`;

  pendingTokens.set(token, { token, username, createdAt: Date.now() });
  return token;
}

/** Look up a pending token. Returns null if expired or not found. */
export function getToken(token: string): PendingToken | null {
  evictExpired();
  return pendingTokens.get(token) ?? null;
}

/** Remove a token after successful verification. */
export function consumeToken(token: string) {
  pendingTokens.delete(token);
}

// --- Profile resolution ---

export interface SoundCloudProfile {
  username: string;
  permalink: string;
  avatar_url: string;
  description: string | null;
  full_name: string;
  city: string | null;
  country_code: string | null;
  followers_count: number;
  track_count: number;
}

/**
 * Resolve a SoundCloud username to a profile via api-v2.
 *
 * WARNING: Undocumented endpoint — may break without notice.
 */
export async function resolveProfile(username: string): Promise<SoundCloudProfile> {
  const clientId = await extractClientId();

  const url = `https://api-v2.soundcloud.com/resolve?url=https://soundcloud.com/${encodeURIComponent(username)}&client_id=${clientId}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; OndaVerifier/0.1)" },
  });

  if (res.status === 404) {
    throw new Error(`SoundCloud user "${username}" not found`);
  }
  if (!res.ok) {
    throw new Error(`SoundCloud API error: ${res.status}`);
  }

  const data = await res.json();

  // The resolve endpoint returns different object types; ensure it's a user
  if (data.kind !== "user") {
    throw new Error(`Expected a user profile but got "${data.kind}"`);
  }

  return {
    username: data.username,
    permalink: data.permalink_url,
    avatar_url: data.avatar_url,
    description: data.description ?? null,
    full_name: data.full_name ?? "",
    city: data.city ?? null,
    country_code: data.country_code ?? null,
    followers_count: data.followers_count ?? 0,
    track_count: data.track_count ?? 0,
  };
}
