import { NextResponse } from "next/server";

// Verification is now fully on-chain via the attestor system.
// This endpoint is deprecated — attestors call attestVerification() directly on the contract.
export async function POST() {
  return NextResponse.json(
    {
      error: "Verification is now handled on-chain. Use the attestor system on the PatronEscrow contract.",
      deprecated: true,
    },
    { status: 410 }
  );
}
