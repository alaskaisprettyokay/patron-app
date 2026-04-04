import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { arcTestnet } from "viem/chains";
import { ESCROW_ADDRESS } from "./contracts";

export interface OnChainGift {
  listener: string;
  amount: string;
  txHash: string;
  blockNumber: number;
  timestamp: number | null;
}

export interface ArtistGiftData {
  gifts: OnChainGift[];
  supporters: number;
  total: number;
}

const TIPPED_EVENT = parseAbiItem(
  "event Tipped(address indexed listener, bytes32 indexed mbidHash, uint256 amount)"
);

// Create a dedicated client — not dependent on wagmi hooks
const client = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

export async function fetchArtistGifts(
  mbidHash: `0x${string}`
): Promise<ArtistGiftData> {
  const logs = await client.getLogs({
    address: ESCROW_ADDRESS,
    event: TIPPED_EVENT,
    args: { mbidHash },
    fromBlock: 0n,
    toBlock: "latest",
  });

  const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber!))];
  const blockTimestamps = new Map<bigint, number>();

  // Batch fetch block timestamps
  const batchSize = 10;
  for (let i = 0; i < uniqueBlocks.length; i += batchSize) {
    const batch = uniqueBlocks.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((bn) => client.getBlock({ blockNumber: bn }))
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        blockTimestamps.set(batch[idx], Number(r.value.timestamp) * 1000);
      }
    });
  }

  const gifts: OnChainGift[] = logs
    .map((log) => ({
      listener: log.args.listener as string,
      amount: formatUnits(log.args.amount as bigint, 6),
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: blockTimestamps.get(log.blockNumber!) ?? null,
    }))
    .reverse(); // newest first

  const supporters = new Set(
    gifts.map((g) => g.listener.toLowerCase())
  ).size;

  return { gifts, supporters, total: gifts.length };
}
