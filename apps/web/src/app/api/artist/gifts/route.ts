import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { mbidToBytes32 } from "@/lib/contracts";

const ARC_RPC = "https://rpc.testnet.arc.network";
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PATRON_ESCROW_ADDRESS as `0x${string}`;

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC] } },
} as const;

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(ARC_RPC),
});

export async function GET(request: NextRequest) {
  const mbid = request.nextUrl.searchParams.get("mbid");
  if (!mbid) {
    return NextResponse.json({ error: "mbid required" }, { status: 400 });
  }

  const mbidHash = mbidToBytes32(mbid);

  try {
    const logs = await client.getLogs({
      address: ESCROW_ADDRESS,
      event: parseAbiItem(
        "event Tipped(address indexed listener, bytes32 indexed mbidHash, uint256 amount)"
      ),
      args: { mbidHash },
      fromBlock: 0n,
      toBlock: "latest",
    });

    // Get timestamps for each log
    const gifts = await Promise.all(
      logs.map(async (log) => {
        let timestamp: number | null = null;
        try {
          const block = await client.getBlock({ blockNumber: log.blockNumber! });
          timestamp = Number(block.timestamp) * 1000;
        } catch {
          // skip
        }

        return {
          listener: log.args.listener as string,
          amount: formatUnits(log.args.amount as bigint, 6),
          txHash: log.transactionHash,
          blockNumber: Number(log.blockNumber),
          timestamp,
        };
      })
    );

    // newest first
    gifts.reverse();

    // unique supporters
    const supporters = new Set(gifts.map((g) => g.listener)).size;

    return NextResponse.json({
      gifts,
      total: gifts.length,
      supporters,
    });
  } catch (error: any) {
    console.error("Failed to fetch artist gift logs:", error?.message || error);

    // Fallback: return empty but don't error — the page has on-chain balance data
    return NextResponse.json({
      gifts: [],
      total: 0,
      supporters: 0,
      error: error?.message || "Failed to query logs",
    });
  }
}
