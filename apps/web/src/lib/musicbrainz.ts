const MB_BASE_URL = "https://musicbrainz.org/ws/2";
const USER_AGENT = "OndaApp/0.1.0 (onda.xyz)";

export interface MBArtist {
  id: string; // MBID
  name: string;
  sortName: string;
  disambiguation?: string;
  country?: string;
}

export interface MBRecording {
  id: string;
  title: string;
  artistCredit: { artist: MBArtist }[];
}

export interface MBUrlRelation {
  type: string;
  url: { resource: string };
}

export interface MBArtistDetails extends MBArtist {
  relations: MBUrlRelation[];
}

async function mbFetch(path: string): Promise<Response> {
  const res = await fetch(`${MB_BASE_URL}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`MusicBrainz API error: ${res.status} ${res.statusText}`);
  }
  return res;
}

export async function searchRecording(
  artist: string,
  track: string
): Promise<{ artist: MBArtist; recording: MBRecording } | null> {
  const query = encodeURIComponent(`artist:"${artist}" AND recording:"${track}"`);
  const res = await mbFetch(`/recording/?query=${query}&fmt=json&limit=5`);
  const data = await res.json();

  if (!data.recordings || data.recordings.length === 0) return null;

  const recording = data.recordings[0];
  const artistCredit = recording["artist-credit"]?.[0];
  if (!artistCredit) return null;

  return {
    artist: {
      id: artistCredit.artist.id,
      name: artistCredit.artist.name,
      sortName: artistCredit.artist["sort-name"],
      disambiguation: artistCredit.artist.disambiguation,
      country: artistCredit.artist.country,
    },
    recording: {
      id: recording.id,
      title: recording.title,
      artistCredit: recording["artist-credit"].map((ac: any) => ({
        artist: {
          id: ac.artist.id,
          name: ac.artist.name,
          sortName: ac.artist["sort-name"],
        },
      })),
    },
  };
}

export async function searchArtist(name: string): Promise<MBArtist[]> {
  const query = encodeURIComponent(`artist:"${name}"`);
  const res = await mbFetch(`/artist/?query=${query}&fmt=json&limit=10`);
  const data = await res.json();

  return (data.artists || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    sortName: a["sort-name"],
    disambiguation: a.disambiguation,
    country: a.country,
  }));
}

export async function getArtistDetails(
  mbid: string
): Promise<MBArtistDetails> {
  const res = await mbFetch(`/artist/${mbid}?inc=url-rels&fmt=json`);
  const data = await res.json();

  return {
    id: data.id,
    name: data.name,
    sortName: data["sort-name"],
    disambiguation: data.disambiguation,
    country: data.country,
    relations: (data.relations || []).map((r: any) => ({
      type: r.type,
      url: { resource: r.url?.resource || "" },
    })),
  };
}

export function getArtistUrls(relations: MBUrlRelation[]) {
  const urls: Record<string, string> = {};
  for (const rel of relations) {
    const resource = rel.url.resource;
    if (resource.includes("bandcamp.com")) urls.bandcamp = resource;
    else if (resource.includes("soundcloud.com")) urls.soundcloud = resource;
    else if (resource.includes("spotify.com")) urls.spotify = resource;
    else if (resource.includes("youtube.com") || resource.includes("youtu.be"))
      urls.youtube = resource;
    else if (rel.type === "official homepage") urls.website = resource;
  }
  return urls;
}
