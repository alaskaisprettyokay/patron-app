"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";

interface ExtensionWallet {
  address: string;
  usdcBalance: string;
  escrowBalance: string;
  error?: string;
}

export function FundExtension({ onWalletDetected }: { onWalletDetected?: (address: string) => void }) {
  const { isConnected } = useAccount();
  const [extWallet, setExtWallet] = useState<ExtensionWallet | null>(null);
  const [detected, setDetected] = useState(false);
  const [amount, setAmount] = useState("5");
  const [sent, setSent] = useState(false);

  const { writeContract, data: hash, isPending } = useWriteContract();
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

  useEffect(() => {
    if (isSuccess) setSent(true);
  }, [isSuccess]);

  const handleSend = () => {
    if (!extWallet?.address) return;
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [extWallet.address as `0x${string}`, parseUnits(amount, 6)],
    });
  };

  if (!detected) {
    return (
      <div className="mb-12 p-6 border border-rule">
        <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-2">extension</h2>
        <p className="text-sm text-ink-light">
          extension not detected. install onda for Chrome and refresh.
        </p>
      </div>
    );
  }

  if (!extWallet) {
    return (
      <div className="mb-12 p-6 border border-rule">
        <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-2">extension</h2>
        <p className="text-sm text-ink-light">connecting...</p>
      </div>
    );
  }

  const funded = parseFloat(extWallet.escrowBalance || "0") > 0;
  const hasUsdc = parseFloat(extWallet.usdcBalance || "0") > 0;

  return (
    <div className="mb-12 p-6 border border-rule">
      <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">extension account</h2>

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-ink-faint mb-0.5">address</div>
          <div
            className="font-mono text-sm text-ink-light cursor-pointer hover:text-onda truncate"
            onClick={() => navigator.clipboard.writeText(extWallet.address)}
          >
            {extWallet.address}
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-faint mb-0.5">balance</div>
          <div className="font-mono text-sm">${extWallet.usdcBalance}</div>
        </div>
        <div>
          <div className="text-xs text-ink-faint mb-0.5">gift balance</div>
          <div className={`font-mono text-sm font-bold ${funded ? "text-onda" : ""}`}>
            ${extWallet.escrowBalance}
          </div>
        </div>
      </div>

      {funded ? (
        <div className="inline-block bg-onda text-paper px-3 py-1 text-xs font-bold uppercase tracking-wide">
          ready
        </div>
      ) : hasUsdc ? (
        <p className="text-sm text-ink-light">
          funds received. click deposit in the extension popup.
        </p>
      ) : isConnected && !sent ? (
        <div className="flex gap-2 items-center flex-wrap">
          {[1, 5, 10, 20].map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(String(preset))}
              className={`px-4 py-2 text-sm font-medium border transition-all ${
                amount === String(preset)
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ink-light hover:border-ink"
              }`}
            >
              ${preset}
            </button>
          ))}
          <button
            onClick={handleSend}
            disabled={isPending || isConfirming}
            className="btn-primary"
          >
            {isConfirming ? "confirming..." : isPending ? "confirm in wallet..." : `send $${amount}`}
          </button>
        </div>
      ) : sent ? (
        <div className="inline-block bg-onda text-paper px-3 py-1 text-xs font-bold uppercase tracking-wide">
          funded
        </div>
      ) : (
        <p className="text-sm text-ink-light">sign in above, then add funds.</p>
      )}
    </div>
  );
}
