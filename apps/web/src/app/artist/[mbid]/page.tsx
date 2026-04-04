"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { getArtistDetails, getArtistUrls, type MBArtistDetails } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI, formatUSDC, mbidToBytes32 } from "@/lib/contracts";
import { REGISTRY_ADDRESS, ONDA_REGISTRY_ABI } from "@/lib/contracts";
import { formatENSName } from "@/lib/ens";

export default function ArtistPage() {
  const params = useParams();
  const mbid = params.mbid as string;
  const mbidHash = mbidToBytes32(mbid);

  const [artist, setArtist] = useState<MBArtistDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
  });

  const { data: subname } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: ONDA_REGISTRY_ABI,
    functionName: "artistSubname",
    args: [mbidHash],
  });

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
        <h1 className="text-2xl font-bold mb-2">can't find this artist yet</h1>
        <p className="text-ink-light text-sm">we're looking.</p>
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

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
      {/* Artist name — biggest thing */}
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
      </div>

      {/* Gifts number */}
      <div className="mb-10">
        <div className="text-xs uppercase tracking-widest text-ink-faint mb-2">gifts received</div>
        <div className="font-mono text-4xl font-bold text-onda">
          ${unclaimed ? formatUSDC(unclaimed as bigint) : "0.00"}
        </div>
        <div className="text-sm text-ink-light mt-1">
          {isClaimed ? "claimed" : "waiting for artist to claim"}
        </div>
      </div>

      {/* Links */}
      {Object.keys(urls).length > 0 && (
        <div className="mb-10">
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
      <div className="mb-10">
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
