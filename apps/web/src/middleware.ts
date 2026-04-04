import { NextRequest, NextResponse } from "next/server";

// Allow requests from Chrome extensions (service workers calling our API)
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const isExtension = origin.startsWith("chrome-extension://");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin, isExtension),
    });
  }

  const response = NextResponse.next();
  if (isExtension) {
    const headers = corsHeaders(origin, true);
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

function corsHeaders(origin: string, allow: boolean): Record<string, string> {
  if (!allow) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export const config = {
  matcher: "/api/:path*",
};
