import { NextRequest, NextResponse } from "next/server";
import { searchRecording } from "@/lib/musicbrainz";
import { mbidToBytes32 } from "@/lib/contracts";

// In-memory tip queue for demo (in production, use a database)
const tipQueue: TipRecord[] = [];

interface TipRecord {
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

    const record: TipRecord = {
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

    tipQueue.unshift(record);
    // Keep last 200 tips in memory
    if (tipQueue.length > 200) tipQueue.length = 200;

    return NextResponse.json({
      success: true,
      tip: record,
    });
  } catch (error) {
    console.error("Tip error:", error);
    return NextResponse.json({ error: "Tip failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ tips: tipQueue.slice(0, 50) });
}
