import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { PATRON_ESCROW_ABI } from "@/lib/contracts";

const ARC_RPC = "https://rpc.testnet.arc.network";
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PATRON_ESCROW_ADDRESS as `0x${string}`;

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
} as const;

// Server-side relayer account — needs USDC for gas on Arc Testnet
const RELAY_KEY = (process.env.RELAYER_PRIVATE_KEY || process.env.RELAY_PRIVATE_KEY) as `0x${string}` | undefined;

export async function POST(request: NextRequest) {
  if (!RELAY_KEY) {
    return NextResponse.json({ error: "Relayer not configured" }, { status: 503 });
  }

  try {
    const { smartAccount, mbidHash, amount, nonce, signature } = await request.json();

    if (!smartAccount || !mbidHash || amount == null || nonce == null || !signature) {
      return NextResponse.json(
        { error: "smartAccount, mbidHash, amount, nonce, and signature are required" },
        { status: 400 }
      );
    }

    const relayer = privateKeyToAccount(RELAY_KEY);

    const walletClient = createWalletClient({
      account: relayer,
      chain: arcTestnet,
      transport: http(ARC_RPC),
    });

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(ARC_RPC),
    });

    const hash = await walletClient.writeContract({
      address: ESCROW_ADDRESS,
      abi: PATRON_ESCROW_ABI,
      functionName: "tipWithSignature",
      args: [
        smartAccount as `0x${string}`,
        mbidHash as `0x${string}`,
        BigInt(amount),
        BigInt(nonce),
        signature as `0x${string}`,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ success: true, txHash: hash, status: receipt.status });
  } catch (error: unknown) {
    console.error("Relay error:", error);
    const message = error instanceof Error ? error.message : "Transaction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
