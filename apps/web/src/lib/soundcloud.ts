const SC_AUTH_URL = "https://soundcloud.com/connect";
const SC_TOKEN_URL = "https://api.soundcloud.com/oauth2/token";
const SC_ME_URL = "https://api.soundcloud.com/me";

export function getSoundCloudClientId(): string {
  const id = process.env.SOUNDCLOUD_CLIENT_ID;
  if (!id) throw new Error("SOUNDCLOUD_CLIENT_ID not configured");
  return id;
}

export function getSoundCloudClientSecret(): string {
  const secret = process.env.SOUNDCLOUD_CLIENT_SECRET;
  if (!secret) throw new Error("SOUNDCLOUD_CLIENT_SECRET not configured");
  return secret;
}

function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/api/auth/soundcloud/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getSoundCloudClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    state,
  });
  return `${SC_AUTH_URL}?${params.toString()}`;
}

export interface SoundCloudTokens {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
}

export async function exchangeCode(code: string): Promise<SoundCloudTokens> {
  const res = await fetch(SC_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getSoundCloudClientId(),
      client_secret: getSoundCloudClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SoundCloud token exchange failed: ${res.status} ${body}`);
  }

  return res.json();
}

export interface SoundCloudUser {
  id: number;
  permalink: string;
  permalink_url: string;
  username: string;
  uri: string;
  avatar_url: string;
}

export async function getMe(accessToken: string): Promise<SoundCloudUser> {
  const res = await fetch(SC_ME_URL, {
    headers: {
      Authorization: `OAuth ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`SoundCloud /me failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Check if a SoundCloud user's profile URL matches the one listed on MusicBrainz.
 * MusicBrainz URLs look like: https://soundcloud.com/artist-name
 * SoundCloud permalink_url looks like: https://soundcloud.com/artist-name
 */
export function profileMatchesMusicBrainz(
  scUser: SoundCloudUser,
  musicBrainzSoundCloudUrl: string
): boolean {
  const normalize = (url: string) =>
    url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, "");

  const scNormalized = normalize(scUser.permalink_url);
  const mbNormalized = normalize(musicBrainzSoundCloudUrl);

  return scNormalized === mbNormalized;
}
