"use client";

import dynamic from "next/dynamic";

const ClientConnectButton = dynamic(
  () =>
    import("@rainbow-me/rainbowkit").then((mod) => {
      const { ConnectButton } = mod;
      return function RainbowButton() {
        return <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />;
      };
    }),
  { ssr: false }
);

export default function ConnectButtonWrapper() {
  return <ClientConnectButton />;
}
