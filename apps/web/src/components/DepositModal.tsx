"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import {
  ESCROW_ADDRESS,
  USDC_ADDRESS,
  ERC20_ABI,
  PATRON_ESCROW_ABI,
  parseUSDC,
} from "@/lib/contracts";

const PRESET_AMOUNTS = [5, 10, 25, 50];

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("10");
  const [step, setStep] = useState<"approve" | "deposit" | "done">("approve");
  const { address } = useAccount();

  const { writeContract: approveWrite, data: approveTx } = useWriteContract();
  const { writeContract: depositWrite, data: depositTx } = useWriteContract();

  const { isLoading: approving } = useWaitForTransactionReceipt({ hash: approveTx });
  const { isLoading: depositing } = useWaitForTransactionReceipt({ hash: depositTx });

  const handleApprove = () => {
    approveWrite({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [ESCROW_ADDRESS, parseUSDC(amount)],
    });
    setStep("deposit");
  };

  const handleDeposit = () => {
    depositWrite({
      address: ESCROW_ADDRESS,
      abi: PATRON_ESCROW_ABI,
      functionName: "deposit",
      args: [parseUSDC(amount)],
    });
    setStep("done");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Deposit USDC</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
            <div className="flex gap-2 mb-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    amount === String(preset)
                      ? "bg-patron-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-patron-500"
              placeholder="Enter amount"
              min="1"
            />
          </div>

          <div className="text-sm text-gray-400">
            At $0.05/listen, ${amount} covers ~{Math.floor(Number(amount) / 0.05)} listens
          </div>

          {step === "approve" && (
            <button onClick={handleApprove} disabled={approving} className="btn-primary w-full">
              {approving ? "Approving..." : `Approve $${amount} USDC`}
            </button>
          )}

          {step === "deposit" && (
            <button onClick={handleDeposit} disabled={depositing} className="btn-primary w-full">
              {depositing ? "Depositing..." : `Deposit $${amount} USDC`}
            </button>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-accent text-lg font-medium mb-2">Deposit Complete!</div>
              <p className="text-gray-400 text-sm">
                Your balance has been topped up. Start listening to auto-tip artists.
              </p>
              <button onClick={onClose} className="btn-primary mt-4">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
