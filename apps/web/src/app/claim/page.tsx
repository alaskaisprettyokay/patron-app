"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { searchArtist, getArtistDetails, getArtistUrls, type MBArtist } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI, mbidToBytes32, formatUSDC } from "@/lib/contracts";
import { artistToSubname, formatENSName } from "@/lib/ens";

type Step = "search" | "verify" | "claim" | "releasing" | "done";

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
  const [releaseResult, setReleaseResult] = useState<{
    txHash?: string;
    unclaimedReleased?: string;
  } | null>(null);
  const [error, setError] = useState("");

  const { writeContract, data: claimHash } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    try {
      const artists = await searchArtist(query);
      setResults(artists);
    } catch (err) {
      setError("can't find that right now. try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectArtist = async (artist: MBArtist) => {
    setSelectedArtist(artist);
    const code = `onda-verify-${artist.id.slice(0, 8)}`;
    setVerificationCode(code);
    try {
      const details = await getArtistDetails(artist.id);
      const urls = getArtistUrls(details.relations);
      setVerifyUrl(urls.bandcamp || urls.website || urls.soundcloud || "");
    } catch {}
    setStep("verify");
  };

  const handleVerify = async (demo: boolean) => {
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbid: selectedArtist!.id,
          code: verificationCode,
          url: demo ? undefined : verifyUrl,
          demo,
        }),
      });
      const data = await res.json();
      if (data.verified) {
        setStep("claim");
      } else {
        setError(data.error || "verification didn't work.");
      }
    } catch {
      setError("couldn't reach the server.");
    } finally {
      setVerifying(false);
    }
  };

  const handleClaim = () => {
    if (!selectedArtist || !address) return;
    setError("");
    writeContract(
      {
        address: ESCROW_ADDRESS,
        abi: ONDA_ESCROW_ABI,
        functionName: "claimArtist",
        args: [mbidToBytes32(selectedArtist.id)],
      },
      { onError: (err) => setError(err.message) }
    );
  };

  const handleRelease = async () => {
    if (!selectedArtist) return;
    setStep("releasing");
    setError("");
    try {
      const res = await fetch("/api/claim/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mbidHash: mbidToBytes32(selectedArtist.id) }),
      });
      const data = await res.json();
      if (data.success) {
        setReleaseResult(data);
        setStep("done");
      } else {
        setError(data.error || "something went wrong.");
        setStep("claim");
      }
    } catch {
      setError("couldn't reach the server.");
      setStep("claim");
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-headline font-bold mb-2">claim</div>
        <p className="text-ink-light text-sm font-mono">
          sign in to claim your profile and receive gifts.
        </p>
      </div>
    );
  }

  const steps: Step[] = ["search", "verify", "claim", "done"];
  const stepIndex = steps.indexOf(step === "releasing" ? "done" : step);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-headline font-bold mb-1">claim</div>
      <p className="text-ink-light text-xs font-mono mb-6">
        people have been giving to you. here's your money.
      </p>

      {/* Progress — monospace stepper */}
      <div className="flex items-center gap-0.5 mb-6 font-mono text-2xs">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <span
              className={
                stepIndex === i
                  ? "text-ink font-bold"
                  : stepIndex > i
                  ? "text-onda"
                  : "text-ink-faint"
              }
            >
              {stepIndex > i ? "[x]" : `[${i + 1}]`} {s}
            </span>
            {i < 3 && <span className="text-rule-dark mx-1">--</span>}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-onda-faint border-l-2 border-onda p-3 mb-4 text-onda text-xs font-mono">
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      {step === "search" && (
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="artist name..."
              className="flex-1 bg-transparent border-b-2 border-ink px-1 py-2 text-ink text-sm font-mono focus:outline-none placeholder:text-ink-faint"
            />
            <button onClick={handleSearch} disabled={searching} className="btn-primary">
              {searching ? "..." : "search"}
            </button>
          </div>
          {results.length > 0 && (
            <div>
              {results.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => handleSelectArtist(artist)}
                  className="w-full text-left py-3 border-b border-rule hover:bg-paper-dark transition-colors block"
                >
                  <div className="font-bold text-base">{artist.name}</div>
                  <div className="text-2xs text-ink-faint font-mono">
                    {artist.disambiguation && <span>{artist.disambiguation} </span>}
                    {artist.country && <span>({artist.country}) </span>}
                    <span className="text-ink-faint/50">{artist.id}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Verify */}
      {step === "verify" && selectedArtist && (
        <div>
          <div className="section-label mb-3">
            verify you're {selectedArtist.name}
          </div>
          {verifyUrl ? (
            <>
              <p className="text-ink-light text-xs font-mono mb-3">
                add this code to your page, then click verify:
              </p>
              <div className="ink-block mb-3 text-center font-mono text-sm select-all">
                <span className="text-onda">{verificationCode}</span>
              </div>
              <p className="text-ink-faint text-2xs font-mono mb-4">
                your page:{" "}
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="text-onda hover:underline">
                  {verifyUrl}
                </a>
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep("search")} className="btn-secondary">back</button>
                <button onClick={() => handleVerify(false)} disabled={verifying} className="btn-primary flex-1">
                  {verifying ? "checking..." : "verify"}
                </button>
              </div>
              <div className="receipt-divider" />
              <button
                onClick={() => handleVerify(true)}
                disabled={verifying}
                className="text-2xs text-ink-faint hover:text-ink w-full text-center font-mono"
              >
                skip verification (demo mode)
              </button>
            </>
          ) : (
            <>
              <p className="text-ink-light text-xs font-mono mb-4">
                no website found on MusicBrainz. use demo mode to proceed.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep("search")} className="btn-secondary">back</button>
                <button onClick={() => handleVerify(true)} disabled={verifying} className="btn-primary flex-1">
                  {verifying ? "verifying..." : "continue in demo mode"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Claim */}
      {step === "claim" && selectedArtist && (
        <div>
          <div className="font-mono text-xs space-y-1.5 mb-6">
            <div className="flex justify-between">
              <span className="text-ink-faint">artist</span>
              <span className="font-bold text-sm">{selectedArtist.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">name</span>
              <span className="text-onda">{formatENSName(artistToSubname(selectedArtist.name))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">account</span>
              <span className="text-2xs">{address}</span>
            </div>
          </div>
          {!claimConfirmed ? (
            <button onClick={handleClaim} className="btn-primary w-full" disabled={!!claimHash}>
              {claimHash ? "confirming..." : "claim profile"}
            </button>
          ) : (
            <button onClick={handleRelease} className="btn-primary w-full">
              verify and release funds
            </button>
          )}
        </div>
      )}

      {/* Releasing */}
      {step === "releasing" && (
        <div className="py-8 font-mono text-xs text-ink-faint">
          verifying...
        </div>
      )}

      {/* Done */}
      {step === "done" && selectedArtist && (
        <div>
          <div className="stamp text-onda border-onda mb-4">claimed</div>
          <div className="text-headline font-bold mb-2">{selectedArtist.name}</div>
          <p className="text-ink-light text-xs font-mono mb-1">
            registered as{" "}
            <span className="text-onda">{formatENSName(artistToSubname(selectedArtist.name))}</span>
          </p>
          {releaseResult?.unclaimedReleased && releaseResult.unclaimedReleased !== "0" && (
            <p className="text-onda font-mono font-bold text-sm mb-1">
              ${formatUSDC(BigInt(releaseResult.unclaimedReleased))} released
            </p>
          )}
          {releaseResult?.txHash && (
            <a
              href={`https://testnet.arcscan.app/tx/${releaseResult.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-onda text-2xs hover:underline font-mono block mb-4"
            >
              view on-chain
            </a>
          )}
          <p className="text-ink-faint text-2xs font-mono mb-6">
            future gifts from listeners go directly to your account.
          </p>
          <a href={`/artist/${selectedArtist.id}`} className="btn-primary inline-block">
            view profile
          </a>
        </div>
      )}
    </div>
  );
}
