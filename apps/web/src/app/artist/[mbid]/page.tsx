"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { getArtistDetails, getArtistUrls, type MBArtistDetails } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI, formatUSDC, mbidToBytes32 } from "@/lib/contracts";
import { REGISTRY_ADDRESS, ONDA_REGISTRY_ABI } from "@/lib/contracts";
import { formatENSName } from "@/lib/ens";

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

  const { data: artistInfo } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ONDA_ESCROW_ABI,
    functionName: "getArtistInfo",
    args: [mbidHash],
    query: { refetchInterval: 10000 },
  });

  const { data: subname } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: ONDA_REGISTRY_ABI,
    functionName: "artistSubname",
    args: [mbidHash],
  });

  const { data: defaultTipAmount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ONDA_ESCROW_ABI,
    functionName: "defaultTipAmount",
  });

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
  const unclaimed = artistInfo ? (artistInfo as [string, boolean, bigint])[2] : 0n;
  const isClaimed = wallet && wallet !== "0x0000000000000000000000000000000000000000";
  const ensName = subname ? formatENSName(subname as string) : null;

  // Derive gift stats from on-chain state
  const tipSize = (defaultTipAmount as bigint) || 10000n; // $0.01 in 6-decimal USDC
  const giftCount = unclaimed > 0n ? Number(unclaimed / tipSize) : 0;
  const perGift = giftCount > 0 ? Number(unclaimed) / giftCount / 1_000_000 : 0;

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
          <div className="text-sm text-ink-light">total gifts</div>
        </div>
        <div className="border-l-2 border-ink pl-4">
          <div className="font-mono text-2xl font-bold">
            ${perGift > 0 ? perGift.toFixed(2) : "—"}
          </div>
          <div className="text-sm text-ink-light">per gift</div>
        </div>
        <div className="border-l-2 border-ink pl-4">
          <div className="text-2xl font-bold">
            {isClaimed && verified ? (
              <span className="text-onda">active</span>
            ) : isClaimed ? (
              <span className="text-ink-light">pending</span>
            ) : (
              <span className="text-ink-faint">unclaimed</span>
            )}
          </div>
          <div className="text-sm text-ink-light">status</div>
        </div>
      </div>

      {/* Visual — gift milestones */}
      {giftCount > 0 && (
        <div className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">milestones</h2>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(giftCount, 50) }).map((_, i) => (
              <div
                key={i}
                className={`h-6 flex-1 max-w-[12px] ${
                  i === giftCount - 1 ? "bg-onda" : "bg-ink/15"
                }`}
                title={`gift #${i + 1}`}
              />
            ))}
            {giftCount > 50 && (
              <span className="text-xs text-ink-faint ml-2 font-mono">+{giftCount - 50}</span>
            )}
          </div>
          <div className="text-xs text-ink-faint mt-2">
            {giftCount} gift{giftCount !== 1 ? "s" : ""} at ${perGift.toFixed(2)} each
          </div>
        </div>
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
