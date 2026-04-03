"use client";

import { useAccount } from "wagmi";

interface WalletConnectPayProps {
  amount?: string;
}

export function WalletConnectPay({ amount = "10" }: WalletConnectPayProps) {
  const { address, isConnected } = useAccount();

  const handleBuyUSDC = () => {
    // WalletConnect Pay / Reown onramp URL
    // For the hackathon demo, this opens the WalletConnect Pay modal
    const params = new URLSearchParams({
      destinationWallets: JSON.stringify([
        {
          address: address || "",
          blockchains: ["base"],
          assets: ["USDC"],
        },
      ]),
      defaultAmount: amount,
      defaultCryptoCurrency: "USDC",
    });

    window.open(
      `https://pay.reown.com/?${params.toString()}`,
      "walletconnect-pay",
      "width=450,height=700,popup=true"
    );
  };

  if (!isConnected) return null;

  return (
    <button
      onClick={handleBuyUSDC}
      className="btn-secondary flex items-center gap-2 w-full justify-center"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
      Buy USDC with Card
    </button>
  );
}
