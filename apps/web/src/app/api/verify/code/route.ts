import { NextRequest, NextResponse } from "next/server";
import { generateVerificationCode, checkRateLimit } from "@/lib/verified-store";
import { getArtistDetails, getArtistUrls } from "@/lib/musicbrainz";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.ip || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const { mbid } = await request.json();

    if (!mbid || typeof mbid !== "string") {
      return NextResponse.json(
        { error: "mbid is required" },
        { status: 400 }
      );
    }

    // Validate MBID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(mbid)) {
      return NextResponse.json(
        { error: "Invalid MBID format" },
        { status: 400 }
      );
    }

    // Fetch artist's known URLs from MusicBrainz to bind verification to them
    let allowedUrls: string[] = [];
    try {
      const details = await getArtistDetails(mbid);
      const urls = getArtistUrls(details.relations);
      allowedUrls = Object.values(urls).filter(Boolean);
    } catch {
      // Artist may not have URLs — that's OK, but they won't be able to do URL verification
    }

    if (allowedUrls.length === 0) {
      return NextResponse.json(
        {
          error: "No verifiable URLs found for this artist on MusicBrainz. " +
            "The artist must have a website, Bandcamp, or SoundCloud linked on MusicBrainz to verify.",
        },
        { status: 400 }
      );
    }

    const { code, expiresAt } = generateVerificationCode(mbid, allowedUrls);

    return NextResponse.json({
      code,
      expiresAt,
      allowedUrls,
      message: "Add this code to one of your linked pages, then call /api/verify to complete verification.",
    });
  } catch (error) {
    console.error("Code generation error:", error);
    return NextResponse.json({ error: "Failed to generate verification code" }, { status: 500 });
  }
}
