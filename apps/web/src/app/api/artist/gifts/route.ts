import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, formatUnits } from "viem";
import { mbidToBytes32 } from "@/lib/contracts";
import { HypersyncClient, Query, Event } from "@envio-dev/hypersync-client";


const ARC_RPC = "https://rpc.testnet.arc.network";
const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PATRON_ESCROW_ADDRESS as `0x${string}`;
const HYPERSYNC_BEARER_TOKEN = process.env.HYPERSYNC_BEARER_TOKEN;

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
  if (!HYPERSYNC_BEARER_TOKEN) {
    return NextResponse.json({ error: "Hypersync not configured" }, { status: 503 });
  }

  const mbid = request.nextUrl.searchParams.get("mbid");
  if (!mbid) {
    return NextResponse.json({ error: "mbid required" }, { status: 400 });
  }

  const mbidHash = mbidToBytes32(mbid);

  const envio = new HypersyncClient({
    url: "https://arc-testnet.hypersync.xyz",
    apiToken: HYPERSYNC_BEARER_TOKEN,
    maxNumRetries: 0,
  });

  const TippedEventHash = '0xdd409f4d8b52105a6673ade3e542f3c8e7cb0985917387804f6620413c683792';

  const query: Query = {
    fromBlock: 0,
    logs: [
      {
        address: [ESCROW_ADDRESS],
        topics: [
          [TippedEventHash],
          [],
          [mbidHash]
        ]
      },
    ],
    fieldSelection: {
      log: [
        'BlockNumber',
        'TransactionHash',
        'LogIndex',
        'Topic0',
        'Topic1',
        'Topic2',
        'Data',
      ],
    },
  };


  try {
    const logs = await envio.getEvents(query);

    // Get timestamps for each log
    const gifts = await Promise.all(
      logs.data.map(async (e: Event, _i, _n) => {
        const log = e.log;
        let timestamp: number | null = null;
        try {
          const block = await client.getBlock({ blockNumber: BigInt(log.blockNumber!) });
          timestamp = Number(block.timestamp) * 1000;
        } catch {
          // skip
        }

        return {
          listener: `0x${String(log.topics[0]).slice(-40)}`,
          amount: formatUnits(BigInt(String(log.data).slice(0, 64)), 6),
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
