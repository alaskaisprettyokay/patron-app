"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { searchArtist, type MBArtist } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, PATRON_ESCROW_ABI, mbidToBytes32, formatUSDC } from "@/lib/contracts";
import { artistToSubname, formatENSName } from "@/lib/ens";

type Step = "search" | "verify" | "claim" | "done";

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MBArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<MBArtist | null>(null);
  const [error, setError] = useState("");

  const mbidHash = selectedArtist ? mbidToBytes32(selectedArtist.id) : undefined;

  // --- Contract writes ---
  const { writeContract: writeClaim, data: claimHash } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  // --- Contract reads (only active after artist selected) ---
  const { data: challengeData } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "getVerificationChallenge",
    args: mbidHash && claimConfirmed ? [mbidHash] : undefined,
    query: { enabled: !!mbidHash && claimConfirmed },
  });

  const { data: artistInfo, refetch: refetchArtistInfo } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "getArtistInfo",
    args: mbidHash ? [mbidHash] : undefined,
    query: { enabled: !!mbidHash },
  });

  const { data: threshold } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "attestationThreshold",
  });

  const { data: currentAttestations, refetch: refetchAttestations } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "attestationCount",
    args: mbidHash ? [mbidHash] : undefined,
    query: { enabled: !!mbidHash },
  });

  const verificationChallenge = challengeData as `0x${string}` | undefined;
  const isOnChainVerified = artistInfo ? (artistInfo as [string, boolean, bigint])[1] : false;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const artists = await searchArtist(query);
      setResults(artists);
    } catch (err) {
      setError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectArtist = (artist: MBArtist) => {
    setSelectedArtist(artist);
    setError("");
    setStep("claim");
  };

  const handleClaim = () => {
    if (!selectedArtist || !address) return;
    setError("");

    writeClaim(
      {
        address: ESCROW_ADDRESS,
        abi: PATRON_ESCROW_ABI,
        functionName: "claimArtist",
        args: [mbidToBytes32(selectedArtist.id)],
      },
      {
        onError: (err) => setError(err.message),
      }
    );
  };

  const handleCheckStatus = async () => {
    await refetchArtistInfo();
    await refetchAttestations();
    if (isOnChainVerified) {
      setStep("done");
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h1 className="text-2xl font-bold mb-2">Claim your artist profile</h1>
        <p className="text-ink-light text-sm mb-6">
          Connect your wallet to claim your profile and receive tips.
        </p>
        <div className="card">
          <p className="text-ink-light text-sm">
            Use the connect button in the navigation bar to get started.
          </p>
        </div>
      </div>
    );
  }

  const steps: Step[] = ["search", "claim", "verify", "done"];
  const currentStep = isOnChainVerified && step !== "search" ? "done" : claimConfirmed && step === "claim" ? "verify" : step;
  const stepIndex = steps.indexOf(currentStep);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Claim your artist profile</h1>
      <p className="text-ink-light text-sm mb-8">
        Claim on-chain. Get verified by independent attestors. Start receiving tips.
      </p>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8 font-mono text-xs">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <span
              className={
                stepIndex === i
                  ? "text-ink font-bold"
                  : stepIndex > i
                  ? "text-accent"
                  : "text-ink-faint"
              }
            >
              {stepIndex > i ? "[x]" : `[${i + 1}]`} {s}
            </span>
            {i < 3 && <span className="text-rule-dark mx-1">—</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="border border-accent bg-accent-muted p-3 mb-4 text-accent text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      {currentStep === "search" && (
        <div className="card">
          <div className="section-label mb-4">Find your artist profile</div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by artist name..."
              className="flex-1 bg-paper border border-rule px-4 py-2 text-ink text-sm focus:outline-none focus:border-ink"
            />
            <button onClick={handleSearch} disabled={searching} className="btn-primary text-sm">
              {searching ? "..." : "Search"}
            </button>
          </div>
          {results.length > 0 && (
            <div className="divide-y divide-rule">
              {results.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => handleSelectArtist(artist)}
                  className="w-full text-left py-3 hover:bg-paper-dark transition-colors"
                >
                  <div className="font-medium text-sm">{artist.name}</div>
                  <div className="text-xs text-ink-faint">
                    {artist.disambiguation && <span>{artist.disambiguation} </span>}
                    {artist.country && <span>({artist.country})</span>}
                  </div>
                  <div className="text-xs text-ink-faint font-mono mt-0.5">{artist.id}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Claim on-chain */}
      {currentStep === "claim" && selectedArtist && (
        <div className="card">
          <div className="section-label mb-4">Claim your profile on-chain</div>
          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-faint">Artist</span>
              <span className="font-medium">{selectedArtist.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">ENS Name</span>
              <span className="font-mono text-accent text-xs">
                {formatENSName(artistToSubname(selectedArtist.name))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">Wallet</span>
              <span className="font-mono text-xs">{address}</span>
            </div>
          </div>

          <button onClick={handleClaim} className="btn-primary w-full text-sm" disabled={!!claimHash}>
            {claimHash ? "Confirming on-chain..." : "Claim profile"}
          </button>

          <button onClick={() => setStep("search")} className="btn-secondary w-full text-sm mt-2">
            Back
          </button>
        </div>
      )}

      {/* Step 3: Awaiting attestor verification */}
      {currentStep === "verify" && selectedArtist && (
        <div className="card">
          <div className="section-label mb-4">Awaiting verification</div>

          <p className="text-ink-light text-sm mb-4">
            Your profile is claimed. Now add this verification challenge to your
            website or Bandcamp so independent attestors can confirm you're the real artist.
          </p>

          {verificationChallenge && (
            <div className="mb-4">
              <label className="text-ink-faint text-xs block mb-1">
                Your on-chain verification challenge:
              </label>
              <div className="bg-paper-dark border border-rule p-3 font-mono text-xs text-accent text-center select-all break-all">
                {verificationChallenge}
              </div>
            </div>
          )}

          <p className="text-ink-faint text-xs mb-4">
            Place this code somewhere publicly visible on your linked website (e.g. in
            a meta tag, about section, or page footer). Attestors will independently
            check your site and submit on-chain attestations.
          </p>

          <div className="bg-paper-dark border border-rule p-3 mb-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-ink-faint">Attestations</span>
              <span className="font-mono">
                {currentAttestations?.toString() ?? "0"} / {threshold?.toString() ?? "?"}
              </span>
            </div>
            <div className="w-full bg-rule h-1.5 mt-1">
              <div
                className="bg-accent h-1.5 transition-all"
                style={{
                  width: `${
                    threshold
                      ? Math.min(100, (Number(currentAttestations ?? 0) / Number(threshold)) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <button onClick={handleCheckStatus} className="btn-primary w-full text-sm">
            Check verification status
          </button>
        </div>
      )}

      {/* Step 4: Done */}
      {currentStep === "done" && selectedArtist && (
        <div className="card py-8">
          <div className="section-label mb-3">Verified</div>
          <h2 className="text-xl font-bold mb-2">Profile verified.</h2>
          <p className="text-ink-light text-sm mb-2">
            You're now registered as{" "}
            <span className="text-accent font-mono">
              {formatENSName(artistToSubname(selectedArtist.name))}
            </span>
          </p>
          <p className="text-ink-faint text-xs mt-4 mb-6">
            Future tips from listeners will be sent directly to your wallet.
            Escrowed funds have been released automatically.
          </p>
          <a
            href={`/artist/${selectedArtist.id}`}
            className="btn-primary inline-block text-sm"
          >
            View your profile
          </a>
        </div>
      )}
    </div>
  );
}
