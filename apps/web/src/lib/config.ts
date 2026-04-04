import { http } from "wagmi";
import { arcTestnet } from "viem/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export { arcTestnet };

export const config = getDefaultConfig({
  appName: "onda",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http(),
  },
});
