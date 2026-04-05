"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { searchArtist, getArtistDetails, getArtistUrls, type MBArtist } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI, mbidToBytes32, formatUSDC } from "@/lib/contracts";
import { artistToSubname, formatENSName } from "@/lib/ens";
import { WorldIDVerify } from "@/components/WorldIDVerify";

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
  const [soundcloudUsername, setSoundcloudUsername] = useState("");
  const [scToken, setScToken] = useState("");
  const [releaseResult, setReleaseResult] = useState<{
    txHash?: string;
    unclaimedReleased?: string;
  } | null>(null);
  const [platformVerified, setPlatformVerified] = useState(false);
  const [worldIdVerified, setWorldIdVerified] = useState(false);
  const [worldIdVerifying, setWorldIdVerifying] = useState(false);
  const [error, setError] = useState("");

  const { writeContract, data: claimHash } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  const { refetch: fetchArtistWallet } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ONDA_ESCROW_ABI,
    functionName: "artistWallet",
    args: selectedArtist ? [mbidToBytes32(selectedArtist.id)] : undefined,
    query: { enabled: false },
  });

  // Auto-release once claimArtist is confirmed — no extra click needed
  useEffect(() => {
    if (claimConfirmed) handleRelease();
  }, [claimConfirmed]);

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
    setSoundcloudUsername("");
    setScToken("");
    try {
      const details = await getArtistDetails(artist.id);
      const urls = getArtistUrls(details.relations);
      if (urls.soundcloud) {
        // Extract username from SoundCloud URL (e.g. https://soundcloud.com/username)
        const scMatch = urls.soundcloud.match(/soundcloud\.com\/([^/?#]+)/);
        if (scMatch) {
          setSoundcloudUsername(scMatch[1]);
          setVerifyUrl(urls.soundcloud);
          setStep("verify");
          return;
        }
      }
      setVerifyUrl(urls.bandcamp || urls.website || "");
    } catch {}
    setStep("verify");
  };

  /** Fetch a verification token from our SoundCloud verify endpoint. */
  const handleSoundcloudToken = async () => {
    if (!soundcloudUsername.trim()) return;
    setError("");
    try {
      const res = await fetch(`/api/verify-soundcloud?username=${encodeURIComponent(soundcloudUsername.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not find that SoundCloud user.");
        return;
      }
      setScToken(data.token);
      setVerificationCode(data.token);
    } catch {
      setError("couldn't reach the server.");
    }
  };

  const handleWorldIDVerified = async (proof: {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    verification_level: string;
  }) => {
    if (!selectedArtist) return;
    setWorldIdVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/verify-worldid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbid: selectedArtist.id,
          ...proof,
        }),
      });
      const data = await res.json();
      if (data.verified) {
        setWorldIdVerified(true);
        if (platformVerified) setStep("claim");
      } else {
        setError(data.error || "World ID verification failed.");
      }
    } catch {
      setError("couldn't reach the server.");
    } finally {
      setWorldIdVerifying(false);
    }
  };

  const handleVerify = async (demo: boolean) => {
    setVerifying(true);
    setError("");
    try {
      // SoundCloud verification — use the bio-token endpoint
      if (!demo && scToken) {
        const res = await fetch("/api/verify-soundcloud", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: scToken }),
        });
        const data = await res.json();
        if (data.verified) {
          // Also mark the MBID as verified so the claim step works
          await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mbid: selectedArtist!.id, code: verificationCode, demo: true }),
          });
          setPlatformVerified(true);
          if (worldIdVerified) setStep("claim");
        } else {
          setError(data.message || data.error || "token not found in your SoundCloud bio.");
        }
      } else {
        // Generic URL verification or demo mode
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
          setPlatformVerified(true);
          if (worldIdVerified) setStep("claim");
        } else {
          setError(data.error || "verification didn't work.");
        }
      }
    } catch {
      setError("couldn't reach the server.");
    } finally {
      setVerifying(false);
    }
  };

  const handleClaim = async () => {
    if (!selectedArtist || !address) return;
    setError("");

    // Check if already claimed before submitting
    const { data: existingWallet } = await fetchArtistWallet();
    const zero = "0x0000000000000000000000000000000000000000";
    if (existingWallet && existingWallet !== zero) {
      if ((existingWallet as string).toLowerCase() === address.toLowerCase()) {
        // Already claimed by this wallet — skip straight to release
        handleRelease();
      } else {
        setError("this artist has already been claimed by a different wallet.");
      }
      return;
    }

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
        body: JSON.stringify({ mbidHash: mbidToBytes32(selectedArtist.id), label: artistToSubname(selectedArtist.name) }),
      });
      const data = await res.json();
      if (data.success) { setReleaseResult(data); setStep("done"); }
      else { setError(data.error || "something went wrong."); setStep("claim"); }
    } catch {
      setError("couldn't reach the server.");
      setStep("claim");
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20">
        <h1 className="text-4xl font-bold mb-3">claim</h1>
        <p className="text-ink-light text-sm">
          sign in to claim your profile and receive gifts.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
      <h1 className="text-4xl font-bold mb-1">claim</h1>
      <p className="text-ink-light text-sm mb-8">
        people have been giving to you. here's your money.
      </p>

      {/* Step indicator */}
      <div className="flex gap-6 mb-8 text-sm">
        {(["search", "verify", "claim", "done"] as Step[]).map((s, i) => {
          const current = step === "releasing" ? "done" : step;
          const idx = (["search", "verify", "claim", "done"] as Step[]).indexOf(current);
          return (
            <span key={s} className={`${idx === i ? "text-ink font-bold border-b-2 border-onda pb-1" : idx > i ? "text-onda" : "text-ink-faint"}`}>
              {s}
            </span>
          );
        })}
      </div>

      {error && (
        <div className="bg-onda/10 border-l-4 border-onda p-4 mb-6 text-sm text-onda">
          {error}
        </div>
      )}

      {/* Search */}
      {step === "search" && (
        <div>
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="artist name..."
              className="flex-1 bg-transparent border-b-2 border-ink px-1 py-3 text-lg focus:outline-none placeholder:text-ink-faint"
            />
            <button onClick={handleSearch} disabled={searching} className="btn-primary">
              {searching ? "..." : "search"}
            </button>
          </div>
          {results.length > 0 && results.map((artist) => (
            <button
              key={artist.id}
              onClick={() => handleSelectArtist(artist)}
              className="w-full text-left py-4 border-b border-rule hover:bg-paper-dark transition-colors block"
            >
              <div className="font-bold text-lg">{artist.name}</div>
              <div className="text-xs text-ink-faint">
                {artist.disambiguation && <span>{artist.disambiguation} </span>}
                {artist.country && <span>({artist.country}) </span>}
                <span className="font-mono">{artist.id}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Verify */}
      {step === "verify" && selectedArtist && (
        <div>
          <h2 className="text-xl font-bold mb-4">verify you&apos;re {selectedArtist.name}</h2>
          <p className="text-ink-light text-sm mb-6">
            two steps: prove you own this profile, then prove you&apos;re human.
          </p>

          {/* Step 1: Platform verification — proves identity */}
          <div className={`border p-5 mb-4 ${platformVerified ? "border-onda" : "border-rule"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">1. verify profile ownership</span>
              {platformVerified && <span className="text-xs text-onda font-mono">[x] done</span>}
            </div>

          {!platformVerified ? (
            <>
          {soundcloudUsername ? (
            <>
              {/* SoundCloud bio-token verification */}
              <p className="text-ink-light text-sm mb-4">
                we&apos;ll verify through your SoundCloud bio.
              </p>

              {/* Editable username — lets the artist fix MusicBrainz typos */}
              <div className="flex gap-3 mb-4 items-end">
                <div className="flex-1">
                  <label className="text-xs text-ink-faint block mb-1">soundcloud username</label>
                  <input
                    type="text"
                    value={soundcloudUsername}
                    onChange={(e) => { setSoundcloudUsername(e.target.value); setScToken(""); }}
                    className="w-full bg-transparent border-b-2 border-ink px-1 py-2 text-sm focus:outline-none font-mono"
                  />
                </div>
                <button onClick={handleSoundcloudToken} className="btn-secondary text-sm whitespace-nowrap">
                  {scToken ? "refresh token" : "get token"}
                </button>
              </div>

              {scToken ? (
                <>
                  <p className="text-ink-light text-sm mb-2">
                    paste this token anywhere in your SoundCloud bio, then click verify:
                  </p>
                  <div className="ink-block p-4 mb-4 text-center font-mono text-onda select-all">
                    {scToken}
                  </div>
                  <p className="text-ink-faint text-xs mb-6">
                    your page:{" "}
                    <a href={`https://soundcloud.com/${soundcloudUsername}`} target="_blank" rel="noopener noreferrer" className="text-onda hover:underline">
                      soundcloud.com/{soundcloudUsername}
                    </a>
                    {" · "}token expires in 15 minutes
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setStep("search")} className="btn-secondary">back</button>
                    <button onClick={() => handleVerify(false)} disabled={verifying} className="btn-primary flex-1">
                      {verifying ? "checking bio..." : "verify"}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-ink-faint text-xs mb-6">
                  click &quot;get token&quot; to start verification
                </p>
              )}

              <button
                onClick={() => handleVerify(true)}
                disabled={verifying}
                className="text-xs text-ink-faint hover:text-ink w-full text-center mt-4 py-2"
              >
                skip verification (demo mode)
              </button>
            </>
          ) : verifyUrl ? (
            <>
              {/* Generic URL verification (bandcamp, website, etc.) */}
              <p className="text-ink-light text-sm mb-4">
                add this code to your page, then click verify:
              </p>
              <div className="ink-block p-4 mb-4 text-center font-mono text-onda">
                {verificationCode}
              </div>
              <p className="text-ink-faint text-xs mb-6">
                your page:{" "}
                <a href={verifyUrl} target="_blank" rel="noopener noreferrer" className="text-onda hover:underline">
                  {verifyUrl}
                </a>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep("search")} className="btn-secondary">back</button>
                <button onClick={() => handleVerify(false)} disabled={verifying} className="btn-primary flex-1">
                  {verifying ? "checking..." : "verify"}
                </button>
              </div>
              <button
                onClick={() => handleVerify(true)}
                disabled={verifying}
                className="text-xs text-ink-faint hover:text-ink w-full text-center mt-4 py-2"
              >
                skip verification (demo mode)
              </button>
            </>
          ) : (
            <>
              <p className="text-ink-light text-sm mb-6">
                no website found on MusicBrainz. use demo mode to proceed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep("search")} className="btn-secondary">back</button>
                <button onClick={() => handleVerify(true)} disabled={verifying} className="btn-primary flex-1">
                  {verifying ? "verifying..." : "continue in demo mode"}
                </button>
              </div>
            </>
          )}
            </>
          ) : (
            <p className="text-ink-faint text-xs">profile ownership confirmed via platform.</p>
          )}
          </div>

          {/* Step 2: World ID — proves unique human */}
          <div className={`border p-5 mb-6 ${worldIdVerified ? "border-onda" : "border-rule"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">2. prove you&apos;re human</span>
              {worldIdVerified && <span className="text-xs text-onda font-mono">[x] done</span>}
            </div>
            {!worldIdVerified ? (
              <>
                <p className="text-ink-light text-xs mb-3">
                  verify with World ID to prevent impersonation.
                </p>
                {worldIdVerifying ? (
                  <p className="text-ink-faint text-sm">verifying proof...</p>
                ) : (
                  <WorldIDVerify
                    onVerified={handleWorldIDVerified}
                    action="verify-artist"
                    signal={selectedArtist.id}
                  />
                )}
              </>
            ) : (
              <p className="text-ink-faint text-xs">verified as unique human via World ID.</p>
            )}
          </div>

          {platformVerified && worldIdVerified && (
            <p className="text-onda text-sm font-bold mb-4">both checks passed — proceeding to claim...</p>
          )}

          <button onClick={() => setStep("search")} className="btn-secondary">back</button>
        </div>
      )}

      {/* Claim */}
      {step === "claim" && selectedArtist && (
        <div>
          <div className="border border-rule p-6 mb-6">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-ink-faint mb-0.5">artist</div>
                <div className="font-bold text-lg">{selectedArtist.name}</div>
              </div>
              <div>
                <div className="text-xs text-ink-faint mb-0.5">name</div>
                <div className="text-onda font-mono">{formatENSName(artistToSubname(selectedArtist.name))}</div>
              </div>
              <div>
                <div className="text-xs text-ink-faint mb-0.5">account</div>
                <div className="font-mono text-xs truncate">{address}</div>
              </div>
            </div>
          </div>
          <button onClick={handleClaim} className="btn-primary w-full" disabled={!!claimHash || claimConfirmed}>
            {claimHash ? "confirming..." : "claim profile"}
          </button>
        </div>
      )}

      {/* Releasing */}
      {step === "releasing" && (
        <div className="py-12 text-ink-faint text-sm">verifying...</div>
      )}

      {/* Done */}
      {step === "done" && selectedArtist && (
        <div>
          <div className="inline-block bg-onda text-paper px-3 py-1 text-xs font-bold uppercase tracking-wide mb-4">
            claimed
          </div>
          <h2 className="text-3xl font-bold mb-2">{selectedArtist.name}</h2>
          <p className="text-ink-light text-sm mb-1">
            registered as{" "}
            <span className="text-onda font-mono">{formatENSName(artistToSubname(selectedArtist.name))}</span>
          </p>
          {releaseResult?.unclaimedReleased && releaseResult.unclaimedReleased !== "0" && (
            <p className="text-onda font-mono font-bold text-lg mb-2">
              ${formatUSDC(BigInt(releaseResult.unclaimedReleased))} released
            </p>
          )}
          {releaseResult?.txHash && (
            <a
              href={`https://testnet.arcscan.app/tx/${releaseResult.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-onda text-sm hover:underline block mb-6"
            >
              view on-chain
            </a>
          )}
          <p className="text-ink-faint text-sm mb-6">
            future gifts from listeners go directly to your account.
          </p>
          <a href={`/artist/${selectedArtist.id}`} className="btn-primary">
            view profile
          </a>
        </div>
      )}
    </div>
  );
}
