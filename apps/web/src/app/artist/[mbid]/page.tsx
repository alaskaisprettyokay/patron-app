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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-ink-faint text-xs font-mono">loading...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-headline font-bold mb-2">?</h1>
        <p className="text-ink-light text-sm font-mono">can't find this artist yet. we're looking.</p>
        <p className="font-mono text-2xs text-ink-faint mt-2">{mbid}</p>
        {loadError && (
          <p className="text-onda text-2xs mt-1 font-mono">{loadError}</p>
        )}
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Artist name — biggest thing on the page */}
      <div className="mb-6">
        <h1 className="text-display font-bold leading-none mb-1">{artist.name}</h1>
        <div className="flex items-center gap-3 font-mono text-xs">
          {ensName && ensName !== ".onda.eth" && (
            <span className="text-onda">{ensName}</span>
          )}
          {artist.disambiguation && <span className="text-ink-faint">{artist.disambiguation}</span>}
          {artist.country && <span className="text-ink-faint">{artist.country}</span>}
          {isClaimed && verified ? (
            <span className="stamp text-onda border-onda text-2xs">verified</span>
          ) : isClaimed ? (
            <span className="stamp text-ink-light border-ink-light text-2xs">claimed</span>
          ) : (
            <span className="stamp text-ink-faint border-ink-faint text-2xs">unclaimed</span>
          )}
        </div>
      </div>

      {/* Gifts number — prominent */}
      <div className="mb-6">
        <div className="section-label mb-1">gifts received</div>
        <div className="big-number text-onda">
          ${unclaimed ? formatUSDC(unclaimed as bigint) : "0.00"}
        </div>
        <div className="text-2xs text-ink-faint font-mono mt-0.5">
          {isClaimed ? "claimed" : "waiting for artist"}
        </div>
      </div>

      <div className="receipt-divider" />

      {/* MBID */}
      <div className="mb-6">
        <div className="section-label mb-1">mbid</div>
        <div className="font-mono text-2xs text-ink-faint break-all">{mbid}</div>
      </div>

      {/* Links */}
      {Object.keys(urls).length > 0 && (
        <>
          <div className="receipt-divider" />
          <div className="mb-6">
            <div className="section-label mb-2">links</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(urls).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-rule text-xs font-mono hover:border-ink hover:bg-ink hover:text-paper transition-all"
                >
                  {platform}
                </a>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Claim CTA */}
      {!isClaimed && (
        <>
          <div className="receipt-divider" />
          <div className="ink-block -mx-4 sm:-mx-6 px-4 sm:px-6 py-6">
            <div className="font-bold text-lg mb-1">are you {artist.name}?</div>
            <p className="text-paper/60 text-xs font-mono mb-3">
              people have been giving to you. claim this profile to receive gifts directly.
              {unclaimed ? ` $${formatUSDC(unclaimed as bigint)} waiting.` : ""}
            </p>
            <a href="/claim" className="font-mono text-xs border border-paper/30 px-5 py-2.5 hover:bg-paper hover:text-ink transition-all inline-block">
              claim this profile
            </a>
          </div>
        </>
      )}
    </div>
  );
}
