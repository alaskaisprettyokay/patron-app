import { NextRequest, NextResponse } from "next/server";
import { searchRecording, searchArtist } from "@/lib/musicbrainz";
import { mbidToBytes32 } from "@/lib/contracts";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get("artist");
  const track = searchParams.get("track");

  if (!artist) {
    return NextResponse.json({ error: "artist parameter required" }, { status: 400 });
  }

  try {
    if (track) {
      // Search by artist + track
      const result = await searchRecording(artist, track);
      if (!result) {
        return NextResponse.json({ error: "No results found" }, { status: 404 });
      }

      return NextResponse.json({
        artist: {
          mbid: result.artist.id,
          name: result.artist.name,
          mbidHash: mbidToBytes32(result.artist.id),
        },
        track: {
          mbid: result.recording.id,
          title: result.recording.title,
        },
      });
    } else {
      // Search by artist name only
      const artists = await searchArtist(artist);
      return NextResponse.json({
        artists: artists.map((a) => ({
          mbid: a.id,
          name: a.name,
          disambiguation: a.disambiguation,
          country: a.country,
          mbidHash: mbidToBytes32(a.id),
        })),
      });
    }
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
