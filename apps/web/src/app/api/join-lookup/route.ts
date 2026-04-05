import { NextRequest, NextResponse } from "next/server";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_PATRON_ESCROW_ADDRESS as string;
const HYPERSYNC_URL = "https://arc-testnet.hypersync.xyz";
const HYPERSYNC_BEARER_TOKEN = process.env.HYPERSYNC_BEARER_TOKEN;

// keccak256("Joined(address,address,address)")
const JOINED_EVENT_HASH = "0x2bd729a8054724da0df9fdf02b37398fb43652780a2590cef6fa6e8abcf43678";

// Indexed address topics are 32 bytes, address in the last 20 (40 hex chars)
function topicToAddress(topic: string): string {
  return `0x${topic.replace(/^0x/, "").slice(-40)}`;
}

export async function GET(request: NextRequest) {
  if (!HYPERSYNC_BEARER_TOKEN) {
    return NextResponse.json({ error: "Hypersync not configured" }, { status: 503 });
  }

  const sessionKey = request.nextUrl.searchParams.get("sessionKey");
  if (!sessionKey) {
    return NextResponse.json({ error: "sessionKey required" }, { status: 400 });
  }

  // Pad sessionKey to 32 bytes for topic matching
  const paddedSessionKey = `0x${sessionKey.replace(/^0x/, "").padStart(64, "0")}`;

  const query = {
    from_block: 0,
    logs: [
      {
        address: [ESCROW_ADDRESS],
        topics: [
          [JOINED_EVENT_HASH],
          [], // topic1 = owner (any)
          [], // topic2 = smartAccount (any)
          [paddedSessionKey], // topic3 = sessionKey (filtered)
        ],
      },
    ],
    field_selection: {
      log: ["topic1", "topic2", "topic3"],
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

    if (logs.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Take the last event — a session key can only be registered once,
    // but take the latest in case of any duplicates
    const log = logs[logs.length - 1];
    return NextResponse.json({
      found: true,
      ownerAddress: topicToAddress(log.topic1),
      smartAccountAddress: topicToAddress(log.topic2),
    });
  } catch (error: any) {
    console.error("[join-lookup] Failed:", error?.message || error);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
