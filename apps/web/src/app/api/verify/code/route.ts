import { NextResponse } from "next/server";

// Verification codes are now generated on-chain via getVerificationChallenge().
// This endpoint is deprecated.
export async function POST() {
  return NextResponse.json(
    {
      error: "Verification codes are now generated on-chain. Call getVerificationChallenge() on the PatronEscrow contract.",
      deprecated: true,
    },
    { status: 410 }
  );
}
