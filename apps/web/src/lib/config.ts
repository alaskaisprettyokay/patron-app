import { http } from "wagmi";
import { baseSepolia, anvil } from "wagmi/chains";
import { arcTestnet } from "viem/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export { arcTestnet };

export const config = getDefaultConfig({
  appName: "onda",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [anvil, arcTestnet, baseSepolia],
  transports: {
    [anvil.id]: http(),
    [arcTestnet.id]: http(),
    [baseSepolia.id]: http(),
  },
});
