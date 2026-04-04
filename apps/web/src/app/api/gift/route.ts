import { NextRequest, NextResponse } from "next/server";
import { searchRecording } from "@/lib/musicbrainz";
import { mbidToBytes32 } from "@/lib/contracts";

// In-memory gift queue for demo (in production, use a database)
const giftQueue: GiftRecord[] = [];

interface GiftRecord {
  artist: string;
  track: string;
  mbid: string | null;
  mbidHash: string | null;
  amount: number;
  platform: string;
  listenerAddress: string | null;
  timestamp: number;
  txHash: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { artist, track, platform, listenerAddress, txHash } = await request.json();

    if (!artist || !track) {
      return NextResponse.json(
        { error: "artist and track are required" },
        { status: 400 }
      );
    }

    // Look up on MusicBrainz
    let mbid: string | null = null;
    let mbidHash: string | null = null;
    try {
      const result = await searchRecording(artist, track);
      if (result) {
        mbid = result.artist.id;
        mbidHash = mbidToBytes32(mbid);
      }
    } catch {
      // MusicBrainz lookup is best-effort
    }

    const record: GiftRecord = {
      artist,
      track,
      mbid,
      mbidHash,
      amount: 0.01,
      platform: platform || "unknown",
      listenerAddress: listenerAddress || null,
      timestamp: Date.now(),
      txHash: txHash || null,
    };

    giftQueue.unshift(record);
    if (giftQueue.length > 200) giftQueue.length = 200;

    return NextResponse.json({
      success: true,
      gift: record,
    });
  } catch (error) {
    console.error("Gift error:", error);
    return NextResponse.json({ error: "Gift failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ gifts: giftQueue.slice(0, 50) });
}
