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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-ink-faint text-sm">loading artist...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h1 className="text-xl font-bold mb-2">can't find this artist yet</h1>
        <p className="text-ink-light text-sm mb-1">we're looking.</p>
        <p className="font-mono text-xs text-ink-faint">{mbid}</p>
        {loadError && (
          <p className="text-onda text-xs mt-2">{loadError}</p>
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">{artist.name}</h1>
        {ensName && ensName !== ".onda.eth" && (
          <div className="text-onda text-sm font-mono mb-1">{ensName}</div>
        )}
        <div className="flex items-center gap-3 text-sm text-ink-faint">
          {artist.disambiguation && <span>{artist.disambiguation}</span>}
          {artist.country && <span>{artist.country}</span>}
          {isClaimed && verified ? (
            <span className="text-onda font-medium">verified</span>
          ) : isClaimed ? (
            <span className="text-ink-light">claimed</span>
          ) : (
            <span>unclaimed</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-px bg-rule mb-8 border border-rule">
        <div className="bg-paper p-4">
          <div className="section-label mb-1">gifts received</div>
          <div className="mono-value text-xl font-bold">
            ${unclaimed ? formatUSDC(unclaimed as bigint) : "0.00"}
          </div>
          <div className="text-xs text-ink-faint mt-0.5">
            {isClaimed ? "claimed" : "waiting for artist"}
          </div>
        </div>
        <div className="bg-paper p-4">
          <div className="section-label mb-1">status</div>
          <div className="text-xl font-bold">
            {isClaimed && verified ? (
              <span className="text-onda">active</span>
            ) : isClaimed ? (
              <span className="text-ink-light">pending</span>
            ) : (
              <span className="text-ink-faint">unclaimed</span>
            )}
          </div>
        </div>
        <div className="bg-paper p-4">
          <div className="section-label mb-1">mbid</div>
          <div className="text-xs font-mono text-ink-faint break-all">{mbid}</div>
        </div>
      </div>

      {/* Links */}
      {Object.keys(urls).length > 0 && (
        <div className="card mb-8">
          <div className="section-label mb-3">links</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(urls).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 border border-rule text-sm hover:border-ink-light transition-colors"
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Claim CTA */}
      {!isClaimed && (
        <div className="card border-onda">
          <div className="section-label mb-2">are you {artist.name}?</div>
          <p className="text-ink-light text-sm mb-3">
            people have been giving to you. claim this profile to receive gifts directly.
            {unclaimed ? ` you have $${formatUSDC(unclaimed as bigint)} waiting.` : ""}
          </p>
          <a href="/claim" className="btn-primary inline-block text-sm">
            claim this profile
          </a>
        </div>
      )}
    </div>
  );
}
