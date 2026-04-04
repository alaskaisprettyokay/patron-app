import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const Providers = dynamic(() => import("./providers").then((m) => m.Providers), {
  ssr: false,
});

const ConnectButtonWrapper = dynamic(
  () => import("@/components/ConnectButtonWrapper"),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Patron — Direct Music Micropayments",
  description:
    "Detect what you're listening to. Pay artists directly. USDC micropayments for music.",
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
          <nav className="border-b border-rule">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="flex justify-between items-center h-14">
                <a href="/" className="font-mono text-sm font-bold tracking-[0.2em] uppercase">
                  Patron
                </a>
                <div className="flex items-center gap-6">
                  <a
                    href="/dashboard"
                    className="text-ink-light hover:text-ink transition-colors text-sm"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/claim"
                    className="text-ink-light hover:text-ink transition-colors text-sm"
                  >
                    Claim
                  </a>
                  <ConnectButtonWrapper />
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
