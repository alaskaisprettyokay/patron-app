import { NextRequest, NextResponse } from "next/server";
import {
  validateVerification,
  markVerified,
  checkRateLimit,
} from "@/lib/verified-store";

// Only allow URL verification against known safe schemes and domains
function isUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS (prevent SSRF against internal services)
    if (parsed.protocol !== "https:") {
      return false;
    }
    // Block internal/private network ranges
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for") || request.ip || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429 }
      );
    }

    const { mbid, code, url } = await request.json();

    if (!mbid || typeof mbid !== "string") {
      return NextResponse.json(
        { error: "mbid is required" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required" },
        { status: 400 }
      );
    }

    // Validate URL is safe to fetch (prevent SSRF)
    if (!isUrlSafe(url)) {
      return NextResponse.json(
        { error: "Invalid verification URL. Must be a public HTTPS URL." },
        { status: 400 }
      );
    }

    // Validate the code and URL against the server-issued record
    const validation = validateVerification(mbid, code, url);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, verified: false },
        { status: 400 }
      );
    }

    // Fetch the URL and check for the code in the page content
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(url, {
        headers: { "User-Agent": "PatronVerifier/0.1.0" },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return NextResponse.json(
          { error: `Could not fetch URL (HTTP ${res.status})`, verified: false },
          { status: 400 }
        );
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
        return NextResponse.json(
          { error: "URL must return an HTML or text page", verified: false },
          { status: 400 }
        );
      }

      const html = await res.text();

      if (!html.includes(code)) {
        return NextResponse.json(
          { error: "Verification code not found on page", verified: false },
          { status: 400 }
        );
      }
    } catch (fetchError: any) {
      const message =
        fetchError?.name === "AbortError"
          ? "URL fetch timed out"
          : "Could not fetch verification URL";
      return NextResponse.json(
        { error: message, verified: false },
        { status: 400 }
      );
    }

    // All checks passed — mark verified
    markVerified(mbid);

    return NextResponse.json({
      verified: true,
      mbid,
      message: "Verification successful. You can now claim your profile.",
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
