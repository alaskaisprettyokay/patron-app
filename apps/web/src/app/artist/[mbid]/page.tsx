"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { getArtistDetails, getArtistUrls, type MBArtistDetails } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, PATRON_ESCROW_ABI, formatUSDC, mbidToBytes32 } from "@/lib/contracts";
import { REGISTRY_ADDRESS, PATRON_REGISTRY_ABI } from "@/lib/contracts";
import { formatENSName } from "@/lib/ens";

export default function ArtistPage() {
  const params = useParams();
  const mbid = params.mbid as string;
  const mbidHash = mbidToBytes32(mbid);

  const [artist, setArtist] = useState<MBArtistDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getArtistDetails(mbid)
      .then(setArtist)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mbid]);

  const { data: artistInfo } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "getArtistInfo",
    args: [mbidHash],
  });

  const { data: subname } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: PATRON_REGISTRY_ABI,
    functionName: "artistSubname",
    args: [mbidHash],
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="animate-pulse text-gray-400">Loading artist...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Artist Not Found</h1>
        <p className="text-gray-400">Could not find artist with MBID: {mbid}</p>
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
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start gap-6 mb-8">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-patron-500 to-accent flex items-center justify-center text-4xl font-bold shrink-0">
          {artist.name[0]}
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-1">{artist.name}</h1>
          {ensName && ensName !== ".patron.eth" && (
            <div className="text-patron-400 text-sm font-mono mb-1">{ensName}</div>
          )}
          {artist.disambiguation && (
            <div className="text-gray-500 text-sm">{artist.disambiguation}</div>
          )}
          {artist.country && (
            <div className="text-gray-500 text-sm">{artist.country}</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            {isClaimed && verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            ) : isClaimed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                Claimed — Pending Verification
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full font-medium">
                Unclaimed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Tips Received</div>
          <div className="text-2xl font-bold text-accent">
            ${unclaimed ? formatUSDC(unclaimed as bigint) : "0.00"}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {isClaimed ? "Claimed" : "In escrow — waiting to be claimed"}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Status</div>
          <div className="text-2xl font-bold">
            {isClaimed && verified ? (
              <span className="text-accent">Active</span>
            ) : isClaimed ? (
              <span className="text-yellow-400">Pending</span>
            ) : (
              <span className="text-gray-500">Unclaimed</span>
            )}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">MBID</div>
          <div className="text-sm font-mono text-gray-400 break-all">{mbid}</div>
        </div>
      </div>

      {/* Links */}
      {Object.keys(urls).length > 0 && (
        <div className="card mb-8">
          <h2 className="text-lg font-semibold mb-4">Links</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(urls).map(([platform, url]) => (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm capitalize transition-colors"
              >
                {platform}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Claim CTA */}
      {!isClaimed && (
        <div className="card bg-gradient-to-r from-patron-950 to-gray-900 border-patron-800">
          <h2 className="text-lg font-semibold mb-2">Are you {artist.name}?</h2>
          <p className="text-gray-400 text-sm mb-4">
            Claim this profile to receive tips directly to your wallet.
            You have ${unclaimed ? formatUSDC(unclaimed as bigint) : "0.00"} waiting.
          </p>
          <a href="/claim" className="btn-primary inline-block">
            Claim This Profile
          </a>
        </div>
      )}
    </div>
  );
}
