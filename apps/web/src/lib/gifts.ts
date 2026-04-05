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
  totalUSDC: string;
}

export async function fetchArtistGifts(
  _mbidHash: `0x${string}`,
  mbid: string
): Promise<ArtistGiftData> {
  const res = await fetch(`/api/artist/gifts?mbid=${encodeURIComponent(mbid)}`);
  if (!res.ok) {
    return { gifts: [], supporters: 0, total: 0, totalUSDC: "0.00" };
  }
  return res.json();
}
