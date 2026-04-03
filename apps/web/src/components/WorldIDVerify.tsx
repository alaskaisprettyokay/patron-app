"use client";

import { useState } from "react";

interface WorldIDVerifyProps {
  onVerified: (proof: WorldIDProof) => void;
}

interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: string;
}

export function WorldIDVerify({ onVerified }: WorldIDVerifyProps) {
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      // In production, this uses the IDKit widget
      // For hackathon demo, we simulate the flow
      const mockProof: WorldIDProof = {
        merkle_root: "0x" + "1".repeat(64),
        nullifier_hash: "0x" + "2".repeat(64),
        proof: "0x" + "3".repeat(512),
        verification_level: "device",
      };
      setVerified(true);
      onVerified(mockProof);
    } catch (error) {
      console.error("World ID verification failed:", error);
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-accent">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm font-medium">Verified Human (World ID)</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleVerify}
      disabled={verifying}
      className="btn-secondary flex items-center gap-2"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
      {verifying ? "Verifying..." : "Verify with World ID"}
    </button>
  );
}
