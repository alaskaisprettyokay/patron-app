"use client";

import { useState, useCallback } from "react";
import { useTip } from "@/hooks/usePatronEscrow";

interface LookupResult {
  artist: { mbid: string; name: string; mbidHash: string };
  track: { mbid: string; title: string };
}

export function NowPlaying() {
  const [artist, setArtist] = useState("");
  const [track, setTrack] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipped, setTipped] = useState(false);

  const { tip, isPending, isConfirming, isSuccess } = useTip();

  const handleSearch = useCallback(async () => {
    if (!artist.trim()) return;
    setSearching(true);
    setError(null);
    setResult(null);
    setTipped(false);

    try {
      const params = new URLSearchParams({ artist: artist.trim() });
      if (track.trim()) params.set("track", track.trim());
      const res = await fetch(`/api/lookup?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Not found");
        return;
      }

      if (data.artist) {
        setResult(data);
      } else if (data.artists?.length > 0) {
        // Artist-only search — use first result
        setResult({
          artist: data.artists[0],
          track: { mbid: "", title: track || "Unknown Track" },
        });
      } else {
        setError("No artists found");
      }
    } catch {
      setError("Search failed");
    } finally {
      setSearching(false);
    }
  }, [artist, track]);

  const handleTip = () => {
    if (!result) return;
    tip(result.artist.mbid);
    setTipped(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Artist name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-patron-500"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Track name (optional)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-patron-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !artist.trim()}
          className="btn-secondary px-4 whitespace-nowrap"
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-patron-600/30 flex items-center justify-center text-patron-400 font-bold">
              {result.artist.name[0]}
            </div>
            <div>
              <div className="font-medium text-white">{result.artist.name}</div>
              <div className="text-sm text-gray-400">{result.track.title}</div>
            </div>
          </div>
          <button
            onClick={handleTip}
            disabled={isPending || isConfirming || isSuccess}
            className="btn-primary text-sm px-4 py-2"
          >
            {isSuccess || tipped
              ? "Tipped $0.01"
              : isConfirming
              ? "Confirming..."
              : isPending
              ? "Confirm in wallet..."
              : "Tip $0.01"}
          </button>
        </div>
      )}
    </div>
  );
}
