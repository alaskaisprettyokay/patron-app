import { NextRequest, NextResponse } from "next/server";
import { verifiedMbids } from "@/lib/verified-store";

export async function POST(request: NextRequest) {
  try {
    const { mbid, code, url, demo } = await request.json();

    if (!mbid) {
      return NextResponse.json(
        { error: "mbid is required" },
        { status: 400 }
      );
    }

    // Demo mode — auto-pass verification
    if (demo) {
      verifiedMbids.add(mbid);
      return NextResponse.json({
        verified: true,
        mbid,
        demo: true,
        message: "Demo verification — auto-approved.",
      });
    }

    // Extension-verified — the extension content script confirmed the code
    // is present on the artist's SoundCloud profile bio
    if (request.headers.get("x-onda-source") === "extension" || demo) {
      if (!demo && !code) {
        return NextResponse.json(
          { error: "code is required" },
          { status: 400 }
        );
      }
      verifiedMbids.add(mbid);
      return NextResponse.json({
        verified: true,
        mbid,
        method: demo ? "demo" : "extension",
        message: demo
          ? "Demo verification — auto-approved."
          : "Verified via SoundCloud profile.",
      });
    }

    if (!code) {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400 }
      );
    }

    // Manual verification — check the code exists on the artist's page
    if (url) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "OndaVerifier/0.1.0" },
        });
        const html = await res.text();

        if (!html.includes(code)) {
          return NextResponse.json(
            { error: "Verification code not found on page", verified: false },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Could not fetch verification URL", verified: false },
          { status: 400 }
        );
      }
    }

    verifiedMbids.add(mbid);

    return NextResponse.json({
      verified: true,
      mbid,
      message: "Verification successful. You can now claim your profile.",
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
