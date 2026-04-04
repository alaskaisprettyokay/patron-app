import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getMe, profileMatchesMusicBrainz } from "@/lib/soundcloud";
import { consumeVerificationState } from "@/lib/verification-state";
import { verifiedMbids } from "@/lib/verified-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const claimUrl = `${baseUrl}/claim`;

  if (error) {
    const params = new URLSearchParams({ sc_error: error });
    return NextResponse.redirect(`${claimUrl}?${params}`);
  }

  if (!code || !state) {
    const params = new URLSearchParams({ sc_error: "missing_params" });
    return NextResponse.redirect(`${claimUrl}?${params}`);
  }

  // Look up the pending verification
  const pending = consumeVerificationState(state);
  if (!pending) {
    const params = new URLSearchParams({ sc_error: "expired_or_invalid_state" });
    return NextResponse.redirect(`${claimUrl}?${params}`);
  }

  try {
    // Exchange code for token
    const tokens = await exchangeCode(code);

    // Get the authenticated user's profile
    const scUser = await getMe(tokens.access_token);

    // Check if their SoundCloud profile matches what MusicBrainz has
    if (!profileMatchesMusicBrainz(scUser, pending.soundcloudUrl)) {
      const params = new URLSearchParams({
        sc_error: "profile_mismatch",
        sc_expected: pending.soundcloudUrl,
        sc_got: scUser.permalink_url,
      });
      return NextResponse.redirect(`${claimUrl}?${params}`);
    }

    // Verified — the SoundCloud account matches MusicBrainz
    verifiedMbids.add(pending.mbid);

    const params = new URLSearchParams({
      sc_verified: "true",
      sc_mbid: pending.mbid,
      sc_username: scUser.username,
    });
    return NextResponse.redirect(`${claimUrl}?${params}`);
  } catch (err) {
    console.error("SoundCloud callback error:", err);
    const params = new URLSearchParams({ sc_error: "auth_failed" });
    return NextResponse.redirect(`${claimUrl}?${params}`);
  }
}
