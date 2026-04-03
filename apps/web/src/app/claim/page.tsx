"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { searchArtist, getArtistDetails, getArtistUrls, type MBArtist } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, PATRON_ESCROW_ABI, mbidToBytes32 } from "@/lib/contracts";
import { artistToSubname, formatENSName } from "@/lib/ens";

type Step = "search" | "verify" | "claim" | "done";

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MBArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<MBArtist | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { writeContract } = useWriteContract();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const artists = await searchArtist(query);
      setResults(artists);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectArtist = async (artist: MBArtist) => {
    setSelectedArtist(artist);
    // Generate verification code
    const code = `patron-verify-${artist.id.slice(0, 8)}`;
    setVerificationCode(code);

    // Get artist URLs for verification
    try {
      const details = await getArtistDetails(artist.id);
      const urls = getArtistUrls(details.relations);
      setVerifyUrl(urls.bandcamp || urls.website || urls.soundcloud || "");
    } catch {
      // URLs are optional
    }

    setStep("verify");
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      // Call verify API
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbid: selectedArtist!.id,
          code: verificationCode,
          url: verifyUrl,
        }),
      });

      if (res.ok) {
        setStep("claim");
      } else {
        alert("Verification failed. Make sure the code is visible on your page.");
      }
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setVerifying(false);
    }
  };

  const handleClaim = () => {
    if (!selectedArtist || !address) return;
    const mbidHash = mbidToBytes32(selectedArtist.id);

    writeContract(
      {
        address: ESCROW_ADDRESS,
        abi: PATRON_ESCROW_ABI,
        functionName: "claimArtist",
        args: [mbidHash],
      },
      {
        onSuccess: () => setStep("done"),
      }
    );
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">Claim Your Artist Profile</h1>
        <p className="text-gray-400 mb-8">
          Connect your wallet to claim your profile and receive tips.
        </p>
        <div className="card inline-block px-8 py-6">
          <p className="text-gray-400">
            Use the connect button in the navigation bar to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Claim Your Artist Profile</h1>
      <p className="text-gray-400 mb-8">
        Verify you're the artist, connect your wallet, and start receiving tips
        directly.
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {(["search", "verify", "claim", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-patron-600 text-white"
                  : (["search", "verify", "claim", "done"].indexOf(step) > i)
                  ? "bg-accent text-white"
                  : "bg-gray-800 text-gray-500"
              }`}
            >
              {["search", "verify", "claim", "done"].indexOf(step) > i ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < 3 && <div className="w-12 h-px bg-gray-800" />}
          </div>
        ))}
      </div>

      {/* Step 1: Search */}
      {step === "search" && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Find your artist profile</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by artist name..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-patron-500"
            />
            <button onClick={handleSearch} disabled={searching} className="btn-primary">
              {searching ? "..." : "Search"}
            </button>
          </div>
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => handleSelectArtist(artist)}
                  className="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="font-medium">{artist.name}</div>
                  <div className="text-sm text-gray-400">
                    {artist.disambiguation && <span>{artist.disambiguation} </span>}
                    {artist.country && <span>({artist.country})</span>}
                  </div>
                  <div className="text-xs text-gray-600 font-mono mt-1">{artist.id}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Verify */}
      {step === "verify" && selectedArtist && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            Verify you're {selectedArtist.name}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Add this verification code to your Bandcamp bio, website, or social media:
          </p>
          <div className="bg-gray-800 rounded-lg p-4 mb-4 font-mono text-patron-400 text-center select-all">
            {verificationCode}
          </div>
          {verifyUrl && (
            <p className="text-gray-500 text-xs mb-4">
              We found your page at:{" "}
              <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="text-patron-400 hover:underline">
                {verifyUrl}
              </a>
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep("search")} className="btn-secondary">
              Back
            </button>
            <button onClick={handleVerify} disabled={verifying} className="btn-primary flex-1">
              {verifying ? "Checking..." : "I've added the code — Verify"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Claim */}
      {step === "claim" && selectedArtist && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Claim your profile</h2>
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Artist</span>
              <span className="font-medium">{selectedArtist.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">ENS Name</span>
              <span className="font-mono text-patron-400">
                {formatENSName(artistToSubname(selectedArtist.name))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Wallet</span>
              <span className="font-mono text-xs">{address}</span>
            </div>
          </div>
          <button onClick={handleClaim} className="btn-primary w-full">
            Claim &amp; Register ENS Subname
          </button>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && selectedArtist && (
        <div className="card text-center py-10">
          <div className="text-4xl mb-4">&#127881;</div>
          <h2 className="text-2xl font-bold mb-2">Profile Claimed!</h2>
          <p className="text-gray-400 mb-2">
            You're now registered as{" "}
            <span className="text-patron-400 font-mono">
              {formatENSName(artistToSubname(selectedArtist.name))}
            </span>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Future tips from listeners will be sent directly to your wallet.
          </p>
          <a
            href={`/artist/${selectedArtist.id}`}
            className="btn-primary inline-block"
          >
            View Your Profile
          </a>
        </div>
      )}
    </div>
  );
}
