import { http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { type Chain } from "viem";
import { arcTestnet } from "viem/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Local Anvil chain for development
export const localhost: Chain = {
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
  testnet: true,
};

export { arcTestnet };

export const config = getDefaultConfig({
  appName: "Patron",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [localhost, arcTestnet, baseSepolia],
  transports: {
    [localhost.id]: http(),
    [arcTestnet.id]: http(),
    [baseSepolia.id]: http(),
  },
});

export const SUPPORTED_CHAINS = [localhost, arcTestnet, baseSepolia] as const;
