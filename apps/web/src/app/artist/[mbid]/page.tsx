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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-ink-faint text-xs font-mono">loading...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-base font-bold mb-1">can't find this artist yet</h1>
        <p className="text-ink-light text-xs mb-1">we're looking.</p>
        <p className="font-mono text-2xs text-ink-faint">{mbid}</p>
        {loadError && (
          <p className="text-onda text-2xs mt-1.5 font-mono">{loadError}</p>
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header — artist name is the most prominent element */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-0.5">{artist.name}</h1>
        {ensName && ensName !== ".onda.eth" && (
          <div className="text-onda text-xs font-mono mb-0.5">{ensName}</div>
        )}
        <div className="flex items-center gap-2 text-2xs text-ink-faint font-mono">
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

      {/* Stats — receipt style */}
      <div className="border border-rule mb-6">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-rule">
          <div className="p-3">
            <div className="section-label mb-0.5">gifts received</div>
            <div className="mono-value text-lg font-bold">
              ${unclaimed ? formatUSDC(unclaimed as bigint) : "0.00"}
            </div>
            <div className="text-2xs text-ink-faint font-mono mt-0.5">
              {isClaimed ? "claimed" : "waiting for artist"}
            </div>
          </div>
          <div className="p-3">
            <div className="section-label mb-0.5">status</div>
            <div className="text-lg font-bold">
              {isClaimed && verified ? (
                <span className="text-onda">active</span>
              ) : isClaimed ? (
                <span className="text-ink-light">pending</span>
              ) : (
                <span className="text-ink-faint">unclaimed</span>
              )}
            </div>
          </div>
          <div className="p-3">
            <div className="section-label mb-0.5">mbid</div>
            <div className="text-2xs font-mono text-ink-faint break-all leading-tight">{mbid}</div>
          </div>
        </div>
      </div>

      {/* Links */}
      {Object.keys(urls).length > 0 && (
        <div className="card mb-6">
          <div className="section-label mb-2">links</div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(urls).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 border border-rule text-2xs font-mono hover:border-ink-light transition-colors"
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
          <div className="section-label mb-1.5">are you {artist.name}?</div>
          <p className="text-ink-light text-xs mb-2.5">
            people have been giving to you. claim this profile to receive gifts directly.
            {unclaimed ? ` you have $${formatUSDC(unclaimed as bigint)} waiting.` : ""}
          </p>
          <a href="/claim" className="btn-primary inline-block text-2xs">
            claim this profile
          </a>
        </div>
      )}
    </div>
  );
}
