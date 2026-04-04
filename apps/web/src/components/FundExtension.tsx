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
      <div className="card mb-8">
        <div className="section-label mb-2">extension</div>
        <p className="text-sm text-ink-light">
          extension not detected. install onda for Chrome and refresh this page.
        </p>
      </div>
    );
  }

  if (!extWallet) {
    return (
      <div className="card mb-8">
        <div className="section-label mb-2">extension</div>
        <p className="text-sm text-ink-light">connecting to extension...</p>
      </div>
    );
  }

  const funded = parseFloat(extWallet.escrowBalance || "0") > 0;
  const hasUsdc = parseFloat(extWallet.usdcBalance || "0") > 0;

  return (
    <div className="card mb-8">
      <div className="section-label mb-4">extension account</div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-ink-faint mb-1">address</div>
          <div
            className="font-mono text-xs text-ink-light cursor-pointer hover:text-onda break-all"
            onClick={() => navigator.clipboard.writeText(extWallet.address)}
            title="click to copy"
          >
            {extWallet.address}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-ink-faint">balance</span>
            <span className="mono-value">${extWallet.usdcBalance}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-faint">gift balance</span>
            <span className={`mono-value ${funded ? "text-onda" : "text-ink-light"}`}>
              ${extWallet.escrowBalance}
            </span>
          </div>
        </div>
      </div>

      {funded ? (
        <div className="py-2 text-onda text-sm font-medium">
          ready to send gifts.
        </div>
      ) : hasUsdc ? (
        <div className="py-2 text-ink-light text-sm">
          funds received. click deposit in the extension popup to activate.
        </div>
      ) : isConnected && !sent ? (
        <div className="space-y-3">
          <div className="text-sm text-ink-light">
            add funds from your connected account:
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1.5">
              {[1, 5, 10, 20].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`px-3 py-1.5 text-xs font-mono font-medium border transition-colors ${
                    amount === String(preset)
                      ? "border-ink bg-ink text-paper"
                      : "border-rule text-ink-light hover:border-ink-light"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <button
              onClick={handleSend}
              disabled={isPending || isConfirming}
              className="btn-primary text-sm px-4 py-1.5"
            >
              {isConfirming ? "confirming..." : isPending ? "confirm in wallet..." : `send $${amount}`}
            </button>
          </div>
        </div>
      ) : sent ? (
        <div className="py-2 text-onda text-sm font-medium">
          funds sent. click deposit in the extension popup to activate.
        </div>
      ) : (
        <div className="text-sm text-ink-light">
          sign in above, then add funds.
        </div>
      )}
    </div>
  );
}
