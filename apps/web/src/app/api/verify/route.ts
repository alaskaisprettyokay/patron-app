import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { mbid, code, url } = await request.json();

    if (!mbid || !code) {
      return NextResponse.json(
        { error: "mbid and code are required" },
        { status: 400 }
      );
    }

    // Verify the code exists on the artist's page
    if (url) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "PatronVerifier/0.1.0" },
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

    // In production: call contract's verifyAndRelease via backend signer
    // For hackathon: return success and let frontend handle the claim tx
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
