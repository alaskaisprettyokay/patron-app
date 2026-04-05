"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useReadContract } from "wagmi";
import { getArtistDetails, getArtistUrls, type MBArtistDetails } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI, formatUSDC, mbidToBytes32 } from "@/lib/contracts";
import { artistToSubname, formatENSName } from "@/lib/ens";
import { fetchArtistGifts, type OnChainGift } from "@/lib/gifts";

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ArtistPage() {
  const params = useParams();
  const mbid = params.mbid as string;
  const mbidHash = mbidToBytes32(mbid);

  const [artist, setArtist] = useState<MBArtistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gifts, setGifts] = useState<OnChainGift[]>([]);
  const [supporters, setSupporters] = useState(0);
  const [giftsLoading, setGiftsLoading] = useState(true);
  const [giftsError, setGiftsError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getArtistDetails(mbid)
      .then(setArtist)
      .catch((err) => {
        console.error("Failed to load artist:", err);
        setLoadError(err?.message || "Failed to load artist data");
      })
      .finally(() => setLoading(false));
  }, [mbid]);

  // Fetch on-chain Tipped events via dedicated viem client
  useEffect(() => {
    let cancelled = false;

    fetchArtistGifts(mbidHash as `0x${string}`, mbid)
      .then((data) => {
        if (cancelled) return;
        setGifts(data.gifts);
        setSupporters(data.supporters);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[onda] getLogs failed:", err);
        setGiftsError(err?.message || "Failed to load gift history");
      })
      .finally(() => {
        if (!cancelled) setGiftsLoading(false);
      });

    return () => { cancelled = true; };
  }, [mbidHash]);

  const { data: artistInfo } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ONDA_ESCROW_ABI,
    functionName: "getArtistInfo",
    args: [mbidHash],
    query: { refetchInterval: 10000 },
  });

  const { data: defaultTipAmount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ONDA_ESCROW_ABI,
    functionName: "defaultTipAmount",
  });

  const unclaimed = artistInfo ? (artistInfo as [string, boolean, bigint])[2] : 0n;
  const tipSize = (defaultTipAmount as bigint) || 10000n;
  const onChainGiftCount = unclaimed > 0n ? Number(unclaimed / tipSize) : 0;
  const giftCount = Math.max(onChainGiftCount, gifts.length);
  const perGift = giftCount > 0 ? Number(unclaimed) / giftCount / 1_000_000 : 0;

  const activityDays = useMemo(() => {
    const giftsWithTime = gifts.filter((g) => g.timestamp);
    const now = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const count = giftsWithTime.filter(
        (g) => g.timestamp! >= dayStart && g.timestamp! < dayEnd
      ).length;
      days.push({
        label: d.toLocaleDateString("en", { weekday: "short" }).toLowerCase(),
        count,
        isToday: i === 0,
      });
    }
    return days;
  }, [gifts]);

  const maxDayCount = Math.max(...activityDays.map((d) => d.count), 1);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-ink-faint text-sm">loading...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20">
        <h1 className="text-2xl font-bold mb-2">can&apos;t find this artist yet</h1>
        <p className="text-ink-light text-sm">we&apos;re looking.</p>
        <p className="font-mono text-xs text-ink-faint mt-3">{mbid}</p>
        {loadError && <p className="text-onda text-xs mt-1">{loadError}</p>}
      </div>
    );
  }

  const urls = getArtistUrls(artist.relations);
  const wallet = artistInfo ? (artistInfo as [string, boolean, bigint])[0] : undefined;
  const verified = artistInfo ? (artistInfo as [string, boolean, bigint])[1] : false;
  const isClaimed = wallet && wallet !== "0x0000000000000000000000000000000000000000";
  const ensName = artist ? formatENSName(artistToSubname(artist.name)) : null;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
      {/* Artist name */}
      <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-none mb-3">
        {artist.name}
      </h1>
      <div className="flex items-center gap-3 mb-10 flex-wrap">
        {ensName && ensName !== ".onda.eth" && (
          <span className="text-onda text-sm font-mono">{ensName}</span>
        )}
        {artist.disambiguation && <span className="text-ink-faint text-sm">{artist.disambiguation}</span>}
        {artist.country && <span className="text-ink-faint text-sm">{artist.country}</span>}
        {isClaimed && verified ? (
          <span className="bg-onda text-paper px-2 py-0.5 text-xs font-bold uppercase tracking-wide">verified</span>
        ) : isClaimed ? (
          <span className="border border-ink px-2 py-0.5 text-xs uppercase tracking-wide">claimed</span>
        ) : (
          <span className="border border-rule text-ink-faint px-2 py-0.5 text-xs uppercase tracking-wide">unclaimed</span>
        )}
        <button
          onClick={handleCopyLink}
          className="text-xs text-ink-faint hover:text-ink transition-colors ml-auto"
        >
          {copied ? "copied!" : "share"}
        </button>
      </div>

      {/* Hero number */}
      <div className="mb-12">
        <div className="text-xs uppercase tracking-widest text-ink-faint mb-2">gifts received</div>
        <div className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-onda leading-none">
          ${unclaimed ? formatUSDC(unclaimed as bigint) : "0.00"}
        </div>
        <div className="text-sm text-ink-light mt-2">
          {isClaimed ? "claimed" : "waiting for artist to claim"}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-6 mb-12">
        <div className="border-l-2 border-ink pl-4">
          <div className="font-mono text-2xl font-bold">{giftCount}</div>
          <div className="text-sm text-ink-light">gifts</div>
        </div>
        <div className="border-l-2 border-ink pl-4">
          <div className="font-mono text-2xl font-bold">
            {giftsLoading ? "..." : supporters}
          </div>
          <div className="text-sm text-ink-light">listeners</div>
        </div>
        <div className="border-l-2 border-ink pl-4">
          <div className="font-mono text-2xl font-bold">
            ${perGift > 0 ? perGift.toFixed(2) : "—"}
          </div>
          <div className="text-sm text-ink-light">per gift</div>
        </div>
      </div>

      {/* Debug: show error if getLogs failed */}
      {giftsError && (
        <div className="mb-6 text-xs font-mono text-ink-faint border border-rule p-3">
          gift history unavailable: {giftsError}
        </div>
      )}

      {/* Activity chart */}
      {gifts.some((g) => g.timestamp) && (
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">activity</h2>
          <div className="flex items-end gap-2 h-24">
            {activityDays.map((day) => {
              const height = maxDayCount > 0 ? (day.count / maxDayCount) * 100 : 0;
              return (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center" style={{ height: "64px" }}>
                    {day.count > 0 ? (
                      <div
                        className={`w-full max-w-[44px] transition-all duration-300 ${
                          day.isToday ? "bg-onda" : "bg-ink/15"
                        }`}
                        style={{ height: `${Math.max(height, 6)}%` }}
                        title={`${day.count} gift${day.count !== 1 ? "s" : ""}`}
                      />
                    ) : (
                      <div className="w-full max-w-[44px] bg-rule/40" style={{ height: "2px" }} />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-mono ${
                      day.isToday ? "text-onda font-bold" : "text-ink-faint"
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent gifts */}
      {gifts.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">recent</h2>
          <div>
            {gifts.slice(0, 15).map((gift, i) => (
              <div
                key={`${gift.txHash}-${i}`}
                className="flex items-baseline justify-between py-3 border-b border-rule last:border-0"
              >
                <div className="min-w-0 mr-4">
                  <span className="font-mono text-sm text-ink-light">
                    {truncateAddress(gift.listener)}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 shrink-0 text-sm">
                  <a
                    href={`https://testnet.arcscan.app/tx/${gift.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-onda font-bold font-mono hover:underline"
                  >
                    ${gift.amount}
                  </a>
                  {gift.timestamp && (
                    <span className="text-ink-faint text-xs">{timeAgo(gift.timestamp)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {giftsLoading && (
        <div className="mb-12 text-ink-faint text-sm">loading listeners...</div>
      )}

      {/* Wallet (claimed artists) */}
      {isClaimed && wallet && (
        <div className="mb-12">
          <div className="text-xs uppercase tracking-widest text-ink-faint mb-2">wallet</div>
          <div
            className="font-mono text-sm text-ink-light cursor-pointer hover:text-onda transition-colors inline-block"
            onClick={() => navigator.clipboard.writeText(wallet)}
            title="click to copy"
          >
            {wallet}
          </div>
        </div>
      )}

      {/* Links */}
      {Object.keys(urls).length > 0 && (
        <div className="mb-12">
          <div className="text-xs uppercase tracking-widest text-ink-faint mb-3">links</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(urls).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-rule px-4 py-2 text-sm hover:bg-ink hover:text-paper hover:border-ink transition-all"
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* MBID */}
      <div className="mb-12">
        <div className="text-xs uppercase tracking-widest text-ink-faint mb-1">mbid</div>
        <div className="font-mono text-xs text-ink-faint">{mbid}</div>
      </div>

      {/* Claim CTA */}
      {!isClaimed && (
        <div className="ink-block -mx-5 sm:-mx-8 px-5 sm:px-8 py-10">
          <h2 className="text-2xl font-bold mb-2">are you {artist.name}?</h2>
          <p className="text-paper/60 text-sm mb-4">
            people have been giving to you. claim this profile to receive gifts directly.
            {unclaimed ? ` $${formatUSDC(unclaimed as bigint)} waiting.` : ""}
          </p>
          <a href="/claim" className="border border-paper/30 px-6 py-3 text-sm hover:bg-paper hover:text-ink transition-all inline-block">
            claim this profile
          </a>
        </div>
      )}
    </div>
  );
}
