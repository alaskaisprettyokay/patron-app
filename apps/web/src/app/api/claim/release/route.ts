import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ESCROW_ADDRESS, PATRON_ESCROW_ABI } from "@/lib/contracts";
import { verifiedMbids } from "@/lib/verified-store";

export async function POST(request: NextRequest) {
  try {
    const { mbidHash } = await request.json();

    if (!mbidHash) {
      return NextResponse.json({ error: "mbidHash is required" }, { status: 400 });
    }

    // Check relayer key is configured
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });

    // Check on-chain state: artist must have called claimArtist first
    const artistInfo = await publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: PATRON_ESCROW_ABI,
      functionName: "getArtistInfo",
      args: [mbidHash as `0x${string}`],
    }) as [string, boolean, bigint];

    const [wallet, verified, unclaimed] = artistInfo;

    if (wallet === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ error: "Artist has not called claimArtist yet" }, { status: 400 });
    }

    if (verified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        wallet,
        message: "Artist is already verified.",
      });
    }

    // Create relayer wallet client
    const account = privateKeyToAccount(relayerKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    });

    // Call verifyAndRelease on the escrow contract
    const txHash = await walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: PATRON_ESCROW_ABI,
      functionName: "verifyAndRelease",
      args: [mbidHash as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({
      success: true,
      txHash,
      wallet,
      unclaimedReleased: unclaimed.toString(),
      message: "Artist verified and funds released.",
    });
  } catch (error: any) {
    console.error("Release error:", error);
    return NextResponse.json(
      { error: error?.shortMessage || error?.message || "Release failed" },
      { status: 500 }
    );
  }
}
