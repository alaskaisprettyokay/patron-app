import { NextRequest, NextResponse } from "next/server";
import {
  generateToken,
  getToken,
  consumeToken,
  resolveProfile,
} from "@/lib/soundcloud";

/**
 * GET /api/verify-soundcloud?username=<soundcloud_username>
 *
 * Generates a verification token for the given SoundCloud username.
 * The artist should paste this token somewhere in their SoundCloud bio,
 * then call POST to complete verification.
 */
export async function GET(request: NextRequest) {
  const username = new URL(request.url).searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "username query parameter is required" },
      { status: 400 }
    );
  }

  // Validate that the SoundCloud user actually exists before issuing a token
  try {
    await resolveProfile(username);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not resolve SoundCloud profile";
    return NextResponse.json({ error: message }, { status: 404 });
  }

  const token = generateToken(username);

  return NextResponse.json({
    token,
    username,
    instructions:
      `Paste "${token}" anywhere in your SoundCloud bio, then call POST /api/verify-soundcloud with { "token": "${token}" } to complete verification. The token expires in 15 minutes.`,
  });
}

/**
 * POST /api/verify-soundcloud
 * Body: { "token": "<token>" }
 *
 * Fetches the artist's SoundCloud bio and checks whether the token is present.
 */
export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token } = body;
  if (!token) {
    return NextResponse.json(
      { error: "token is required in request body" },
      { status: 400 }
    );
  }

  const pending = getToken(token);
  if (!pending) {
    return NextResponse.json(
      { error: "Token not found or expired. Request a new one via GET." },
      { status: 404 }
    );
  }

  let profile;
  try {
    profile = await resolveProfile(pending.username);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not fetch SoundCloud profile";
    return NextResponse.json(
      { error: message, verified: false },
      { status: 502 }
    );
  }

  const bio = profile.description ?? "";
  if (!bio.includes(token)) {
    return NextResponse.json({
      verified: false,
      message: `Token not found in bio for ${profile.username}. Make sure you saved your bio after pasting the token.`,
    });
  }

  // Success — consume the token so it can't be reused
  consumeToken(token);

  return NextResponse.json({
    verified: true,
    profile: {
      username: profile.username,
      permalink: profile.permalink,
      avatar_url: profile.avatar_url,
      full_name: profile.full_name,
      city: profile.city,
      country_code: profile.country_code,
      followers_count: profile.followers_count,
      track_count: profile.track_count,
    },
  });
}
