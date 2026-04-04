import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, http, createPublicClient } from "viem";
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

export async function POST(request: NextRequest) {
  try {
    const { action, mbidHash, senderKey } = await request.json();

    if (!senderKey || !mbidHash) {
      return NextResponse.json({ error: "senderKey and mbidHash required" }, { status: 400 });
    }

    const account = privateKeyToAccount(senderKey as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain: arcTestnet,
      transport: http(ARC_RPC),
    });

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(ARC_RPC),
    });

    if (action === "tipDefault") {
      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: PATRON_ESCROW_ABI,
        functionName: "tipDefault",
        args: [mbidHash as `0x${string}`],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      return NextResponse.json({
        success: true,
        txHash: hash,
        status: receipt.status,
      });
    }

    if (action === "approve") {
      const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: [
          {
            name: "approve",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ] as const,
        functionName: "approve",
        args: [ESCROW_ADDRESS, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return NextResponse.json({ success: true, txHash: hash, status: receipt.status });
    }

    if (action === "deposit") {
      const { amount } = await request.json();
      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: PATRON_ESCROW_ABI,
        functionName: "deposit",
        args: [BigInt(amount)],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      return NextResponse.json({ success: true, txHash: hash, status: receipt.status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Relay error:", error);
    return NextResponse.json(
      { error: error?.message || "Transaction failed" },
      { status: 500 }
    );
  }
}
