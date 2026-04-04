import { NextResponse } from "next/server";

// Fund release is now triggered automatically when attestation threshold is met on-chain.
// This endpoint is deprecated — no relayer needed.
export async function POST() {
  return NextResponse.json(
    {
      error: "Fund release is now automatic via the on-chain attestor system. No relayer needed.",
      deprecated: true,
    },
    { status: 410 }
  );
}
