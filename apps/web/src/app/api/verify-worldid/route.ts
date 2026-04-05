import { NextRequest, NextResponse } from "next/server";
import { verifiedMbids } from "@/lib/verified-store";

const WORLD_APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";

/**
 * Server-side World ID proof verification for artist claims.
 *
 * The IDKit widget on the client generates a ZKP that the user is a unique
 * human.  We verify it here via World's cloud API, then mark the artist's
 * MBID as verified so the claim flow can proceed.
 */
export async function POST(request: NextRequest) {
  try {
    const { mbid, proof, merkle_root, nullifier_hash, verification_level } =
      await request.json();

    if (!mbid) {
      return NextResponse.json(
        { error: "mbid is required" },
        { status: 400 },
      );
    }

    if (!proof || !merkle_root || !nullifier_hash) {
      return NextResponse.json(
        { error: "World ID proof fields are required" },
        { status: 400 },
      );
    }

    // Verify the proof server-side via World's API (required for the prize track)
    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${WORLD_APP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merkle_root,
          nullifier_hash,
          proof,
          action: "verify-artist",
          signal: mbid,
          verification_level: verification_level || "device",
        }),
      },
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      console.error("World ID verification failed:", err);
      return NextResponse.json(
        {
          error:
            err?.detail || err?.code || "World ID proof verification failed",
          verified: false,
        },
        { status: 400 },
      );
    }

    // Proof is valid — mark MBID as verified
    verifiedMbids.add(mbid);

    return NextResponse.json({
      verified: true,
      mbid,
      nullifier_hash,
      message:
        "World ID verification successful. You can now claim your profile.",
    });
  } catch (error) {
    console.error("World ID verify error:", error);
    return NextResponse.json(
      { error: "World ID verification failed" },
      { status: 500 },
    );
  }
}
