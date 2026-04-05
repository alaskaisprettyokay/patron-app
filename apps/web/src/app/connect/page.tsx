"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits } from "viem";
import { ESCROW_ADDRESS, PATRON_ESCROW_ABI, ERC20_ABI, USDC_ADDRESS } from "@/lib/contracts";
import { isAddress } from "viem";

const PRESETS = [1, 5, 10, 20];

function FundSection({ smartAccount }: { smartAccount: `0x${string}` }) {
  const [amount, setAmount] = useState("5");
  const { writeContract, data: fundHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: fundHash });

  function handleFund() {
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [smartAccount, parseUnits(amount, 6)],
    });
  }

  return (
    <div className="fund-section">
      <div className="section-title">Fund your tip account</div>
      <div className="session-row" style={{ marginBottom: 16 }}>
        <span className="label">Smart account</span>
        <code className="address">{smartAccount}</code>
      </div>
      <p className="hint">Send USDC to your smart account so Onda can auto-tip artists.</p>

      {isSuccess ? (
        <div className="success">
          <span className="check">✓</span>
          {amount} USDC sent — you're ready to tip.
        </div>
      ) : (
        <>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button
                key={p}
                className={`preset-btn${amount === String(p) ? " selected" : ""}`}
                onClick={() => setAmount(String(p))}
              >
                ${p}
              </button>
            ))}
            <input
              className="amount-input"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <button
            className="join-btn"
            onClick={handleFund}
            disabled={isPending || isConfirming || !amount}
          >
            {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : `Send ${amount} USDC`}
          </button>
          {error && (
            <p className="error">{(error as { shortMessage?: string }).shortMessage ?? error.message}</p>
          )}
          {fundHash && !isSuccess && (
            <p className="hint" style={{ marginTop: 12 }}>
              <a href={`https://testnet.arcscan.app/tx/${fundHash}`} target="_blank" rel="noopener noreferrer">
                {fundHash.slice(0, 10)}…
              </a>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ConnectInner() {
  const params = useSearchParams();
  const sessionKey = params.get("session");

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: smartAccount } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "smartAccounts",
    args: address ? [address] : undefined,
    query: { enabled: isSuccess && !!address },
  });

  const sessionValid = sessionKey && isAddress(sessionKey);

  function handleJoin() {
    if (!sessionValid) return;
    writeContract({
      address: ESCROW_ADDRESS,
      abi: PATRON_ESCROW_ABI,
      functionName: "join",
      args: [sessionKey as `0x${string}`],
    });
  }

  if (!sessionValid) {
    return (
      <div className="card">
        <h1>Invalid link</h1>
        <p>This link is missing a valid session key. Open the Onda extension and try again.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Connect your wallet to Onda</h1>
      <p className="subtitle">
        This links your wallet to the Onda browser extension so it can sign tips on your behalf.
      </p>

      <div className="session-row">
        <span className="label">Session key</span>
        <code className="address">{sessionKey}</code>
      </div>

      {!isConnected ? (
        <>
          <p className="hint">Connect your wallet to continue.</p>
          <div className="connect-btn">
            <ConnectButton />
          </div>
        </>
      ) : isSuccess ? (
        <>
          <div className="success">
            <span className="check">✓</span>
            Wallet linked — fund your account below to start tipping.
          </div>
          {smartAccount && smartAccount !== "0x0000000000000000000000000000000000000000" && (
            <FundSection smartAccount={smartAccount as `0x${string}`} />
          )}
        </>
      ) : (
        <button
          className="join-btn"
          onClick={handleJoin}
          disabled={isPending || isConfirming}
        >
          {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : "Link wallet"}
        </button>
      )}

      {error && (
        <p className="error">{(error as { shortMessage?: string }).shortMessage ?? error.message}</p>
      )}

      {hash && !isSuccess && (
        <p className="hint">
          Transaction submitted:{" "}
          <a
            href={`https://testnet.arcscan.app/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {hash.slice(0, 10)}…
          </a>
        </p>
      )}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <>
      <style>{`
        body { background: #f5f0e8; font-family: 'JetBrains Mono', 'Courier New', monospace; }
        .card {
          max-width: 480px; margin: 80px auto; padding: 32px;
          background: #fff; border: 1px solid #c4bcb0;
        }
        h1 { font-size: 16px; font-weight: 700; margin-bottom: 8px; color: #1c1917; }
        .subtitle { font-size: 12px; color: #78716c; margin-bottom: 24px; line-height: 1.6; }
        .session-row {
          display: flex; flex-direction: column; gap: 4px;
          background: #f5f0e8; border: 1px solid #c4bcb0; padding: 12px;
          margin-bottom: 24px;
        }
        .label { font-size: 9px; text-transform: uppercase; letter-spacing: 2px; color: #a8a29e; }
        .address { font-size: 11px; color: #1c1917; word-break: break-all; }
        .hint { font-size: 11px; color: #78716c; margin-bottom: 16px; }
        .connect-btn { margin-top: 8px; }
        .join-btn {
          width: 100%; padding: 12px; background: #1c1917; color: #f5f0e8;
          border: none; font-family: inherit; font-size: 12px; font-weight: 600;
          letter-spacing: 1px; text-transform: uppercase; cursor: pointer;
        }
        .join-btn:hover:not(:disabled) { background: #3c2917; }
        .join-btn:disabled { opacity: 0.4; cursor: default; }
        .success {
          display: flex; align-items: center; gap: 8px;
          color: #b84a32; font-size: 13px; font-weight: 500; margin-top: 8px;
          margin-bottom: 24px;
        }
        .check { font-size: 18px; }
        .error { color: #b84a32; font-size: 11px; margin-top: 12px; }
        a { color: #78716c; }
        .fund-section { border-top: 1px solid #c4bcb0; padding-top: 24px; }
        .section-title { font-size: 12px; font-weight: 700; color: #1c1917; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .preset-row { display: flex; gap: 6px; margin-bottom: 12px; align-items: center; }
        .preset-btn {
          padding: 6px 12px; border: 1px solid #c4bcb0; background: #f5f0e8;
          font-family: inherit; font-size: 11px; cursor: pointer; color: #78716c;
        }
        .preset-btn.selected { border-color: #1c1917; background: #1c1917; color: #f5f0e8; }
        .amount-input {
          width: 64px; padding: 6px 8px; border: 1px solid #c4bcb0;
          font-family: inherit; font-size: 11px; background: #fff; color: #1c1917;
          margin-left: auto;
        }
        .amount-input:focus { outline: none; border-color: #1c1917; }
      `}</style>
      <Suspense>
        <ConnectInner />
      </Suspense>
    </>
  );
}
