import { NextRequest, NextResponse } from "next/server";
import { searchRecording } from "@/lib/musicbrainz";
import { mbidToBytes32 } from "@/lib/contracts";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

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

// Persistent JSON store
const DATA_DIR = join(process.cwd(), ".data");
const GIFTS_FILE = join(DATA_DIR, "gifts.json");

function loadGifts(): GiftRecord[] {
  try {
    if (existsSync(GIFTS_FILE)) {
      return JSON.parse(readFileSync(GIFTS_FILE, "utf-8"));
    }
  } catch {
    // corrupted file, start fresh
  }
  return [];
}

function saveGifts(gifts: GiftRecord[]) {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(GIFTS_FILE, JSON.stringify(gifts));
  } catch (err) {
    console.error("Failed to persist gifts:", err);
  }
}

// Load from disk on startup
let giftStore: GiftRecord[] = loadGifts();

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

    giftStore.unshift(record);
    if (giftStore.length > 1000) giftStore.length = 1000;
    saveGifts(giftStore);

    return NextResponse.json({
      success: true,
      gift: record,
    });
  } catch (error) {
    console.error("Gift error:", error);
    return NextResponse.json({ error: "Gift failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const mbid = request.nextUrl.searchParams.get("mbid");

  if (mbid) {
    const artistGifts = giftStore.filter((g) => g.mbid === mbid);
    const supporters = new Set(
      artistGifts.map((g) => g.listenerAddress).filter(Boolean)
    ).size;
    const tracks = new Set(artistGifts.map((g) => g.track)).size;

    return NextResponse.json({
      gifts: artistGifts.slice(0, 50),
      total: artistGifts.length,
      supporters,
      tracks,
    });
  }

  return NextResponse.json({ gifts: giftStore.slice(0, 50) });
}
