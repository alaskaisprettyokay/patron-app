"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";

interface ExtensionWallet {
  address: string;
  usdcBalance: string;
  escrowBalance: string;
  error?: string;
}

interface TopUpPanelProps {
  /** Called once with the extension wallet address as soon as it's detected. */
  onWalletDetected?: (address: string) => void;
}

const PRESETS = [5, 10, 25];

export function TopUpPanel({ onWalletDetected }: TopUpPanelProps) {
  const { isConnected } = useAccount();
  const [extWallet, setExtWallet] = useState<ExtensionWallet | null>(null);
  const [detected, setDetected] = useState(false);
  const [amount, setAmount] = useState<number>(10);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "ONDA_WALLET_INFO") {
        setDetected(true);
        if (event.data.wallet?.address) {
          setExtWallet(event.data.wallet);
          onWalletDetected?.(event.data.wallet.address);
        }
      }
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "ONDA_REQUEST_WALLET_INFO" }, "*");
    const interval = setInterval(() => {
      window.postMessage({ type: "ONDA_REQUEST_WALLET_INFO" }, "*");
    }, 10000);
    return () => {
      window.removeEventListener("message", handler);
      clearInterval(interval);
    };
  }, [onWalletDetected]);

  const handleTopUp = () => {
    if (!extWallet?.address) return;
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [extWallet.address as `0x${string}`, parseUnits(String(amount), 6)],
    });
  };

  const buttonLabel = (() => {
    if (isPending) return "confirm in wallet…";
    if (isConfirming) return "topping up…";
    if (isSuccess) return "topped up ✓";
    return "top up balance ↑";
  })();

  const isDisabled = !isConnected || !extWallet?.address || isPending || isConfirming;

  return (
    <div
      style={{
        background: "var(--onda-paper-2, #E3DCCD)",
        padding: 20,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint mb-1">
        balance running low?
      </div>
      <div className="text-xl sm:text-2xl font-bold tracking-tight leading-tight mb-5">
        top up to keep
        <br />
        sending <span className="onda-serif-italic text-onda">waves.</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAmount(p);
              if (isSuccess) reset();
            }}
            className={`text-sm font-mono py-3 transition-colors ${
              amount === p
                ? "border-2 border-ink bg-paper"
                : "border border-ink/20 bg-paper/50 hover:border-ink"
            }`}
          >
            ${p}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleTopUp}
        disabled={isDisabled}
        className="bg-ink text-paper font-bold py-3.5 transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {buttonLabel}
      </button>

      <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint text-center mt-3">
        apple pay · card · direct deposit
      </div>

      {!detected && (
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint text-center mt-2">
          waiting for extension…
        </div>
      )}
      {detected && !isConnected && (
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint text-center mt-2">
          sign in to top up
        </div>
      )}
    </div>
  );
}
