import { NextRequest, NextResponse } from "next/server";
import { formatUnits } from "viem";
import { mbidToBytes32 } from "@/lib/contracts";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PATRON_ESCROW_ADDRESS as string;
const HYPERSYNC_URL = "https://arc-testnet.hypersync.xyz";
const HYPERSYNC_BEARER_TOKEN = process.env.HYPERSYNC_BEARER_TOKEN;
const ARC_RPC = "https://rpc.testnet.arc.network";

// keccak256("Tipped(address,bytes32,uint256,uint256)")
const TIPPED_EVENT_HASH = "0xdd409f4d8b52105a6673ade3e542f3c8e7cb0985917387804f6620413c683792";

export async function GET(request: NextRequest) {
  if (!HYPERSYNC_BEARER_TOKEN) {
    return NextResponse.json({ error: "Hypersync not configured" }, { status: 503 });
  }

  const mbid = request.nextUrl.searchParams.get("mbid");
  if (!mbid) {
    return NextResponse.json({ error: "mbid required" }, { status: 400 });
  }

  const mbidHash = mbidToBytes32(mbid);

  const query = {
    from_block: 0,
    logs: [
      {
        address: [ESCROW_ADDRESS],
        topics: [
          [TIPPED_EVENT_HASH],
          [],        // topic1 = smartAccount (any)
          [mbidHash], // topic2 = mbidHash (filtered)
        ],
      },
    ],
    field_selection: {
      log: ["block_number", "transaction_hash", "topic1", "data"],
    },
  };

  try {
    const res = await fetch(`${HYPERSYNC_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${HYPERSYNC_BEARER_TOKEN}`,
      },
      body: JSON.stringify(query),
    });

    if (!res.ok) {
      throw new Error(`Hypersync error ${res.status}: ${await res.text()}`);
    }

    const json = await res.json();
    const logs: any[] = (json.data ?? []).flatMap((item: any) => item.logs ?? []);

    // Fetch timestamps for unique blocks via raw RPC (no viem needed server-side)
    const uniqueBlocks = [...new Set<number>(logs.map((l) => l.blockNumber))];
    const blockTimestamps = new Map<number, number>();

    await Promise.allSettled(
      uniqueBlocks.map(async (bn) => {
        try {
          const rpcRes = await fetch(ARC_RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber",
              params: [`0x${bn.toString(16)}`, false],
            }),
          });
          const { result } = await rpcRes.json();
          if (result?.timestamp) {
            blockTimestamps.set(bn, parseInt(result.timestamp, 16) * 1000);
          }
        } catch {
          // best-effort
        }
      })
    );

    const gifts = logs
      .map((log) => ({
        listener: `0x${String(log.topic1).slice(-40)}`,
        amount: formatUnits(
          BigInt(`0x${String(log.data).replace(/^0x/, "").slice(0, 64)}`),
          6
        ),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: blockTimestamps.get(log.blockNumber) ?? null,
      }))
      .reverse();

    const supporters = new Set(gifts.map((g) => g.listener.toLowerCase())).size;

    return NextResponse.json({ gifts, total: gifts.length, supporters });
  } catch (error: any) {
    console.error("Failed to fetch artist gift logs:", error?.message || error);
    return NextResponse.json({ gifts: [], total: 0, supporters: 0, error: error?.message });
  }
}
