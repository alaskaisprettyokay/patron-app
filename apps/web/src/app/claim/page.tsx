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
    } catch {
      // URLs are optional
    }

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
    const mbidHash = mbidToBytes32(selectedArtist.id);

    writeContract(
      {
        address: ESCROW_ADDRESS,
        abi: ONDA_ESCROW_ABI,
        functionName: "claimArtist",
        args: [mbidHash],
      },
      {
        onError: (err) => setError(err.message),
      }
    );
  };

  const handleRelease = async () => {
    if (!selectedArtist) return;
    setStep("releasing");
    setError("");
    const mbidHash = mbidToBytes32(selectedArtist.id);

    try {
      const res = await fetch("/api/claim/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mbidHash }),
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
        <h1 className="text-2xl font-bold mb-2">claim your profile</h1>
        <p className="text-ink-light text-sm mb-6">
          sign in to claim your profile and receive gifts.
        </p>
        <div className="card">
          <p className="text-ink-light text-sm">
            use the connect button in the navigation bar to get started.
          </p>
        </div>
      </div>
    );
  }

  const steps: Step[] = ["search", "verify", "claim", "done"];
  const stepIndex = steps.indexOf(step === "releasing" ? "done" : step);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">claim your profile</h1>
      <p className="text-ink-light text-sm mb-8">
        people have been giving to you. here's your money.
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
        <div className="border border-onda bg-onda-muted p-3 mb-4 text-onda text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      {step === "search" && (
        <div className="card">
          <div className="section-label mb-4">find your artist profile</div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="search by artist name..."
              className="flex-1 bg-paper border border-rule px-4 py-2 text-ink text-sm focus:outline-none focus:border-ink"
            />
            <button onClick={handleSearch} disabled={searching} className="btn-primary text-sm">
              {searching ? "..." : "search"}
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

      {/* Step 2: Verify */}
      {step === "verify" && selectedArtist && (
        <div className="card">
          <div className="section-label mb-4">
            verify you're {selectedArtist.name}
          </div>

          {verifyUrl ? (
            <>
              <p className="text-ink-light text-sm mb-4">
                add this code to your page, then click verify:
              </p>
              <div className="bg-paper-dark border border-rule p-3 mb-4 font-mono text-sm text-onda text-center select-all">
                {verificationCode}
              </div>
              <p className="text-ink-faint text-xs mb-4">
                your page:{" "}
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="text-onda hover:underline">
                  {verifyUrl}
                </a>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep("search")} className="btn-secondary text-sm">
                  back
                </button>
                <button onClick={() => handleVerify(false)} disabled={verifying} className="btn-primary text-sm flex-1">
                  {verifying ? "checking..." : "i've added the code -- verify"}
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-rule">
                <button
                  onClick={() => handleVerify(true)}
                  disabled={verifying}
                  className="text-xs text-ink-faint hover:text-ink w-full text-center"
                >
                  skip verification (demo mode)
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-ink-light text-sm mb-4">
                no website found for this artist on MusicBrainz. you can use demo mode to proceed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep("search")} className="btn-secondary text-sm">
                  back
                </button>
                <button onClick={() => handleVerify(true)} disabled={verifying} className="btn-primary text-sm flex-1">
                  {verifying ? "verifying..." : "continue in demo mode"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Claim */}
      {step === "claim" && selectedArtist && (
        <div className="card">
          <div className="section-label mb-4">claim your profile</div>
          <div className="space-y-2 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-faint">artist</span>
              <span className="font-medium">{selectedArtist.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">name</span>
              <span className="font-mono text-onda text-xs">
                {formatENSName(artistToSubname(selectedArtist.name))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-faint">account</span>
              <span className="font-mono text-xs">{address}</span>
            </div>
          </div>

          {!claimConfirmed ? (
            <button onClick={handleClaim} className="btn-primary w-full text-sm" disabled={!!claimHash}>
              {claimHash ? "confirming..." : "claim profile"}
            </button>
          ) : (
            <button onClick={handleRelease} className="btn-primary w-full text-sm">
              verify and release funds
            </button>
          )}
        </div>
      )}

      {/* Step 3.5: Releasing */}
      {step === "releasing" && (
        <div className="card py-8">
          <div className="text-ink-light text-sm mb-1">verifying...</div>
          <p className="text-ink-faint text-xs">this may take a moment.</p>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && selectedArtist && (
        <div className="card py-8">
          <div className="section-label mb-3">claimed</div>
          <h2 className="text-xl font-bold mb-2">you're all set.</h2>
          <p className="text-ink-light text-sm mb-2">
            you're now registered as{" "}
            <span className="text-onda font-mono">
              {formatENSName(artistToSubname(selectedArtist.name))}
            </span>
          </p>
          {releaseResult?.unclaimedReleased && releaseResult.unclaimedReleased !== "0" && (
            <p className="text-onda font-mono font-medium text-sm mb-2">
              ${formatUSDC(BigInt(releaseResult.unclaimedReleased))} released to your account.
            </p>
          )}
          {releaseResult?.txHash && (
            <a
              href={`https://testnet.arcscan.app/tx/${releaseResult.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-onda text-xs hover:underline"
            >
              view on-chain
            </a>
          )}
          <p className="text-ink-faint text-xs mt-4 mb-6">
            future gifts from listeners will go directly to your account.
          </p>
          <a
            href={`/artist/${selectedArtist.id}`}
            className="btn-primary inline-block text-sm"
          >
            view your profile
          </a>
        </div>
      )}
    </div>
  );
}
