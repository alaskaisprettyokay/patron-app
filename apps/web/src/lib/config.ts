import { http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { type Chain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Arc Testnet chain definition
export const arcTestnet: Chain = {
  id: 1637450,
  name: "Arc Testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc-testnet.arc.money"] },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer-testnet.arc.money" },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: "Patron",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [arcTestnet, baseSepolia],
  transports: {
    [arcTestnet.id]: http(),
    [baseSepolia.id]: http(),
  },
});

export const SUPPORTED_CHAINS = [arcTestnet, baseSepolia] as const;
