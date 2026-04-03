import type { Metadata } from "next";
import { Providers } from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patron — Direct Music Micropayments",
  description:
    "Detect what you're listening to. Tip artists directly. Crypto-powered micropayments for music.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <a href="/" className="flex items-center gap-2">
                  <span className="text-2xl font-bold bg-gradient-to-r from-patron-400 to-accent bg-clip-text text-transparent">
                    Patron
                  </span>
                </a>
                <div className="flex items-center gap-6">
                  <a
                    href="/dashboard"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/claim"
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Artists
                  </a>
                  <ConnectButton />
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}

function ConnectButton() {
  return (
    <div id="connect-button">
      <ClientConnectButton />
    </div>
  );
}

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
