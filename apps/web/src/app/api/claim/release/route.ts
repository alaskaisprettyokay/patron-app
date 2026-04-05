import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arcTestnet } from "viem/chains";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI } from "@/lib/contracts";

export async function POST(request: NextRequest) {
  try {
    const { mbidHash, label, artist, signature } = await request.json();

    if (!mbidHash) {
      return NextResponse.json({ error: "mbidHash is required" }, { status: 400 });
    }
    if (!label) {
      return NextResponse.json({ error: "label is required" }, { status: 400 });
    }
    if (!artist) {
      return NextResponse.json({ error: "artist is required" }, { status: 400 });
    }
    if (!signature) {
      return NextResponse.json({ error: "signature is required" }, { status: 400 });
    }

    // Check relayer key is configured
    const relayerKey = process.env.RELAYER_PRIVATE_KEY;
    if (!relayerKey) {
      return NextResponse.json({ error: "Relayer not configured" }, { status: 500 });
    }

    const account = privateKeyToAccount(relayerKey as `0x${string}`);
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });
    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(),
    });

    const txHash = await walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: ONDA_ESCROW_ABI,
      functionName: "verifyAndRelease",
      args: [mbidHash as `0x${string}`, label as string, artist as `0x${string}`, signature as `0x${string}`],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({
      success: true,
      txHash,
      wallet: artist,
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
