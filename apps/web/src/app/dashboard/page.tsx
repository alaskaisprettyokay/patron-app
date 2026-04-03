"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { ESCROW_ADDRESS, PATRON_ESCROW_ABI, formatUSDC } from "@/lib/contracts";
import { DepositModal } from "@/components/DepositModal";
import { TipFeed } from "@/components/TipFeed";
import { WorldIDVerify } from "@/components/WorldIDVerify";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [showDeposit, setShowDeposit] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);

  const { data: balance } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "listenerBalance",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: totalTipped } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "totalTipped",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-3xl font-bold mb-4">Listener Dashboard</h1>
        <p className="text-gray-400 mb-8">
          Connect your wallet to start tipping artists.
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
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <WorldIDVerify onVerified={() => setIsHumanVerified(true)} />
      </div>

      {/* Balance cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Balance</div>
          <div className="text-2xl font-bold text-white">
            ${balance ? formatUSDC(balance as bigint) : "0.00"}
          </div>
          <div className="text-xs text-gray-500 mt-1">USDC available for tips</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Total Tipped</div>
          <div className="text-2xl font-bold text-accent">
            ${totalTipped ? formatUSDC(totalTipped as bigint) : "0.00"}
          </div>
          <div className="text-xs text-gray-500 mt-1">Lifetime contributions</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-400 mb-1">Artists Supported</div>
          <div className="text-2xl font-bold text-purple-400">0</div>
          <div className="text-xs text-gray-500 mt-1">Unique artists tipped</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button onClick={() => setShowDeposit(true)} className="btn-primary">
          Deposit USDC
        </button>
        <a
          href="#extension"
          className="btn-secondary"
        >
          Install Extension
        </a>
      </div>

      {/* Setup checklist */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-4">Setup Checklist</h2>
        <div className="space-y-3">
          <CheckItem done={isConnected} label="Connect wallet" />
          <CheckItem done={isHumanVerified} label="Verify humanity (World ID)" />
          <CheckItem
            done={balance ? (balance as bigint) > 0n : false}
            label="Deposit USDC"
          />
          <CheckItem done={false} label="Install Chrome extension" />
          <CheckItem done={false} label="Play a track and auto-tip" />
        </div>
      </div>

      {/* Recent tips */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Tips</h2>
        <TipFeed />
      </div>

      <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          done
            ? "border-accent bg-accent/20"
            : "border-gray-600"
        }`}
      >
        {done && (
          <svg className="w-3 h-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className={done ? "text-gray-400 line-through" : "text-white"}>
        {label}
      </span>
    </div>
  );
}
