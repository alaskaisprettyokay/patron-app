"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useSearchParams } from "next/navigation";
import { searchArtist, getArtistDetails, getArtistUrls, type MBArtist } from "@/lib/musicbrainz";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI, mbidToBytes32, formatUSDC } from "@/lib/contracts";
import { artistToSubname, formatENSName } from "@/lib/ens";

type Step = "search" | "verify" | "claim" | "releasing" | "done";

export default function ClaimPage() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MBArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<MBArtist | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [releaseResult, setReleaseResult] = useState<{
    txHash?: string;
    unclaimedReleased?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [scVerifiedUsername, setScVerifiedUsername] = useState("");

  const { writeContract, data: claimHash } = useWriteContract();
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });

  // Handle SoundCloud OAuth callback params
  useEffect(() => {
    const scVerified = searchParams.get("sc_verified");
    const scError = searchParams.get("sc_error");
    const scMbid = searchParams.get("sc_mbid");
    const scUsername = searchParams.get("sc_username");

    if (scVerified === "true" && scMbid) {
      setScVerifiedUsername(scUsername || "");
      setStep("claim");
      // Restore selected artist from localStorage
      const saved = localStorage.getItem("onda_claim_artist");
      if (saved) {
        try {
          setSelectedArtist(JSON.parse(saved));
        } catch {}
      }
      // Clean URL
      window.history.replaceState({}, "", "/claim");
    } else if (scError) {
      const errorMessages: Record<string, string> = {
        profile_mismatch: `soundcloud account doesn't match. expected: ${searchParams.get("sc_expected")}`,
        expired_or_invalid_state: "verification expired. try again.",
        missing_params: "something went wrong with the redirect.",
        auth_failed: "soundcloud authentication failed.",
        access_denied: "soundcloud access was denied.",
      };
      setError(errorMessages[scError] || `soundcloud error: ${scError}`);
      setStep("verify");
      // Restore selected artist
      const saved = localStorage.getItem("onda_claim_artist");
      if (saved) {
        try {
          const artist = JSON.parse(saved);
          setSelectedArtist(artist);
          setVerificationCode(`onda-verify-${artist.id.slice(0, 8)}`);
        } catch {}
      }
      window.history.replaceState({}, "", "/claim");
    }
  }, [searchParams]);

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
    localStorage.setItem("onda_claim_artist", JSON.stringify(artist));
    const code = `onda-verify-${artist.id.slice(0, 8)}`;
    setVerificationCode(code);
    try {
      const details = await getArtistDetails(artist.id);
      const urls = getArtistUrls(details.relations);
      setSoundcloudUrl(urls.soundcloud || "");
      setVerifyUrl(urls.bandcamp || urls.website || urls.soundcloud || "");
    } catch {}
    setStep("verify");
  };

  const handleSoundCloudVerify = async () => {
    if (!selectedArtist || !soundcloudUrl) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/soundcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mbid: selectedArtist.id,
          soundcloudUrl,
        }),
      });
      const data = await res.json();
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
      } else {
        setError(data.error || "couldn't start soundcloud auth.");
        setVerifying(false);
      }
    } catch {
      setError("couldn't reach the server.");
      setVerifying(false);
    }
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
      if (data.verified) setStep("claim");
      else setError(data.error || "verification didn't work.");
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
          <h2 className="text-xl font-bold mb-4">verify you're {selectedArtist.name}</h2>

          {/* SoundCloud OAuth — primary method when available */}
          {soundcloudUrl && (
            <div className="mb-6">
              <p className="text-ink-light text-sm mb-3">
                sign in with your soundcloud account to verify ownership:
              </p>
              <button
                onClick={handleSoundCloudVerify}
                disabled={verifying}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1.175 16.778c-.078 0-.144-.063-.15-.142L.578 13.2l.447-3.39c.006-.08.072-.143.15-.143.074 0 .14.063.15.143l.52 3.39-.52 3.436c-.01.08-.076.142-.15.142zm1.96.47c-.09 0-.16-.074-.166-.163L2.58 13.2l.39-5.09c.005-.09.076-.164.166-.164.087 0 .16.074.167.163l.45 5.09-.45 3.886c-.008.09-.08.163-.167.163zm1.99.04c-.1 0-.18-.084-.186-.184L4.56 13.2l.38-5.784c.005-.1.085-.184.185-.184.097 0 .177.084.186.184l.44 5.784-.44 3.904c-.01.1-.09.184-.186.184zm2.03-.01c-.11 0-.197-.094-.203-.205L6.58 13.2l.373-6.093c.006-.11.093-.204.204-.204.108 0 .196.094.205.204l.43 6.093-.43 3.878c-.01.11-.097.205-.205.205zm2.04-.02c-.12 0-.215-.103-.22-.224L8.62 13.2l.354-6.18c.006-.12.1-.224.22-.224.118 0 .213.103.22.224l.41 6.18-.41 3.852c-.008.12-.103.224-.22.224zm2.04-.01c-.13 0-.233-.113-.237-.245L10.66 13.2l.337-5.858c.004-.132.107-.245.237-.245.128 0 .23.113.238.245l.39 5.858-.39 3.83c-.008.132-.11.244-.238.244zm2.04 0c-.14 0-.248-.122-.252-.265L12.7 13.2l.323-6.454c.004-.142.113-.265.253-.265.138 0 .248.123.255.265l.37 6.454-.37 3.818c-.007.143-.117.265-.255.265zm2.15-.01c-.15 0-.264-.123-.267-.275l-.335-3.543.335-6.65c.003-.152.117-.275.267-.275.148 0 .263.123.27.275l.382 6.65-.383 3.543c-.007.152-.122.275-.27.275zm1.24-12.322c-.22 0-.42.05-.604.14-.126.062-.16.124-.163.248l-.34 7.937.342 3.465c.004.162.136.293.3.293h.005c.165 0 .296-.13.303-.293l.39-3.465-.39-7.888c-.003-.152-.068-.245-.188-.318-.165-.085-.346-.13-.536-.13-.226 0-.44.06-.632.17.103-.054.217-.084.336-.084.32 0 .584.22.617.537l.005.008c-.037-.318-.3-.537-.614-.537h-.002c.034-.025.263-.083.398-.083zm1.643-.227c-.52 0-.977.24-1.28.614a.312.312 0 0 0-.077.203l-.32 7.99.322 3.408c.004.175.147.314.322.314.174 0 .316-.14.323-.314l.364-3.408-.365-7.992a.312.312 0 0 0-.076-.203c.292.307.717.5 1.19.5.328 0 .635-.093.896-.253a1.77 1.77 0 0 0-.9.248c-.303.187-.503.5-.55.86v-.003c.047-.36.247-.673.55-.86.265-.16.572-.25.9-.25.923 0 1.673.75 1.673 1.673v8.195c0 .344-.13.66-.342.9.212-.238.342-.555.342-.9V8.895c0-.923-.75-1.673-1.673-1.673z"/>
                </svg>
                {verifying ? "redirecting..." : "verify with soundcloud"}
              </button>
              <p className="text-ink-faint text-xs mt-2 text-center">
                we'll match your soundcloud account against{" "}
                <a href={soundcloudUrl} target="_blank" rel="noopener noreferrer" className="text-onda hover:underline">
                  {soundcloudUrl.replace(/^https?:\/\//, "")}
                </a>
              </p>
            </div>
          )}

          {/* Divider when both methods available */}
          {soundcloudUrl && verifyUrl && (
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 border-t border-rule" />
              <span className="text-xs text-ink-faint">or verify manually</span>
              <div className="flex-1 border-t border-rule" />
            </div>
          )}

          {/* Manual code verification — fallback */}
          {verifyUrl ? (
            <>
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
                  {verifying ? "checking..." : "verify with code"}
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
          ) : !soundcloudUrl ? (
            <>
              <p className="text-ink-light text-sm mb-6">
                no website or soundcloud found on MusicBrainz. use demo mode to proceed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setStep("search")} className="btn-secondary">back</button>
                <button onClick={() => handleVerify(true)} disabled={verifying} className="btn-primary flex-1">
                  {verifying ? "verifying..." : "continue in demo mode"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep("search")} className="btn-secondary">back</button>
            </div>
          )}
        </div>
      )}

      {/* Claim */}
      {step === "claim" && selectedArtist && (
        <div>
          {scVerifiedUsername && (
            <div className="bg-onda/10 border-l-4 border-onda p-4 mb-6 text-sm text-onda">
              verified via soundcloud as <span className="font-bold">{scVerifiedUsername}</span>
            </div>
          )}
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
