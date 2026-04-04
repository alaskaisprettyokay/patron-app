import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/soundcloud";
import { createVerificationState } from "@/lib/verification-state";

export async function POST(request: NextRequest) {
  try {
    const { mbid, soundcloudUrl } = await request.json();

    if (!mbid || !soundcloudUrl) {
      return NextResponse.json(
        { error: "mbid and soundcloudUrl are required" },
        { status: 400 }
      );
    }

    const state = createVerificationState(mbid, soundcloudUrl);
    const authorizeUrl = buildAuthorizeUrl(state);

    return NextResponse.json({ authorizeUrl });
  } catch (error) {
    console.error("SoundCloud auth init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize SoundCloud auth" },
      { status: 500 }
    );
  }
}
